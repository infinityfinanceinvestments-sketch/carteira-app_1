// Busca séries históricas de indicadores de mercado pra comparação com a
// carteira do cliente (CDI, IPCA, Ibovespa, S&P 500). Fontes públicas, sem
// necessidade de chave de API:
//   - CDI: Banco Central, série SGS 12 (taxa diária, % ao dia)
//   - IPCA: Banco Central, série SGS 433 (variação mensal, %)
//   - Ibovespa / S&P 500: Yahoo Finance (cotações de fechamento ajustado)
//
// Cada série é convertida num índice acumulado (base 100 na primeira data
// disponível) — o que importa pra comparação é a variação percentual, não o
// valor absoluto.
//
// Cache em duas camadas:
//   1. Memória (cacheSeries, TTL 12h) — evita rebater tudo a cada request
//      idêntica dentro da mesma janela (mesmo indicador+intervalo).
//   2. SQLite (lib/repo/indices.ts) — guarda o valor BRUTO de cada dia (taxa
//      do CDI, variação do IPCA, fechamento do IBOV/S&P) de forma
//      persistente, porque um dia já publicado nunca muda. Só o valor bruto
//      é cacheável assim: o índice acumulado depende da dataInicial de cada
//      consulta (cada cliente tem um histórico começando numa data
//      diferente), então a acumulação continua sendo recalculada a cada
//      chamada — só a busca do dado bruto na fonte externa é evitada quando
//      o intervalo pedido já está coberto pelo que já foi persistido antes.

import {
  limitesPersistidos,
  lerValoresBrutosPersistidos,
  salvarValoresBrutos,
  type PontoIndicadorBruto,
} from "./repo/indices";

export type Indicador = "CDI" | "IPCA" | "IBOV" | "SP500";

export interface PontoIndice {
  data: string; // yyyy-MM-dd
  valor: number;
}

interface CacheEntrada {
  buscadoEm: number;
  pontos: PontoIndice[];
}

const cacheSeries = new Map<string, CacheEntrada>();
const TTL_MS = 12 * 60 * 60 * 1000; // 12h — evita rebater as APIs externas a cada requisição

function paraDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function brParaIso(br: string): string {
  const [dia, mes, ano] = br.split("/");
  return `${ano}-${mes}-${dia}`;
}

/** Busca os pontos brutos de um indicador num intervalo, usando o cache
 *  persistido em SQLite quando o intervalo pedido já está totalmente
 *  coberto (zero chamadas de rede) — caso contrário busca o intervalo
 *  completo na fonte externa via `buscarNaFonte` e persiste o resultado
 *  antes de devolver. */
async function obterBrutosComPersistencia(
  indicador: Indicador,
  dataInicial: string,
  dataFinal: string,
  buscarNaFonte: (dataInicial: string, dataFinal: string) => Promise<PontoIndicadorBruto[]>
): Promise<PontoIndicadorBruto[]> {
  const limites = limitesPersistidos(indicador);
  if (limites && dataInicial >= limites.min && dataFinal <= limites.max) {
    return lerValoresBrutosPersistidos(indicador, dataInicial, dataFinal);
  }

  const brutos = await buscarNaFonte(dataInicial, dataFinal);
  try {
    salvarValoresBrutos(indicador, brutos);
  } catch (erro) {
    // Falha ao persistir não deve derrubar a resposta — só perdemos o
    // benefício do cache na próxima chamada.
    console.error(`Erro persistindo valores brutos de ${indicador}`, erro);
  }
  return brutos;
}

async function buscarSerieBcbBruto(
  codigoSerie: number,
  dataInicial: string,
  dataFinal: string
): Promise<PontoIndicadorBruto[]> {
  const url =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigoSerie}/dados` +
    `?formato=json&dataInicial=${paraDataBr(dataInicial)}&dataFinal=${paraDataBr(dataFinal)}`;
  const res = await fetch(url, { next: { revalidate: false } });
  if (!res.ok) {
    throw new Error(`Banco Central respondeu ${res.status} pra série ${codigoSerie}.`);
  }
  const dados = (await res.json()) as { data: string; valor: string }[];
  return dados.map((d) => ({ data: brParaIso(d.data), valor_bruto: Number(d.valor) }));
}

async function buscarCDI(dataInicial: string, dataFinal: string): Promise<PontoIndice[]> {
  const brutos = await obterBrutosComPersistencia("CDI", dataInicial, dataFinal, (di, df) =>
    buscarSerieBcbBruto(12, di, df)
  );
  let indice = 100;
  return brutos.map((b) => {
    const taxaDia = b.valor_bruto / 100;
    indice *= 1 + taxaDia;
    return { data: b.data, valor: indice };
  });
}

async function buscarIPCA(dataInicial: string, dataFinal: string): Promise<PontoIndice[]> {
  const brutos = await obterBrutosComPersistencia("IPCA", dataInicial, dataFinal, (di, df) =>
    buscarSerieBcbBruto(433, di, df)
  );
  let indice = 100;
  return brutos.map((b) => {
    const variacaoMes = b.valor_bruto / 100;
    indice *= 1 + variacaoMes;
    return { data: b.data, valor: indice };
  });
}

function rangeYahooParaPeriodo(dataInicial: string): string {
  const anos = (Date.now() - new Date(dataInicial).getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (anos <= 1) return "2y";
  if (anos <= 4) return "5y";
  return "10y";
}

async function buscarSerieYahooBruto(
  ticker: string,
  dataInicial: string,
  dataFinal: string
): Promise<PontoIndicadorBruto[]> {
  const range = rangeYahooParaPeriodo(dataInicial);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?range=${range}&interval=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    next: { revalidate: false },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance respondeu ${res.status} pra ${ticker}.`);
  }
  const json = await res.json();
  const resultado = json?.chart?.result?.[0];
  const timestamps: number[] = resultado?.timestamp ?? [];
  const fechamentos: (number | null)[] =
    resultado?.indicators?.adjclose?.[0]?.adjclose ??
    resultado?.indicators?.quote?.[0]?.close ??
    [];

  const inicioMs = new Date(dataInicial).getTime();
  const fimMs = new Date(dataFinal).getTime() + 24 * 60 * 60 * 1000;

  const pontos: PontoIndicadorBruto[] = [];
  timestamps.forEach((ts, i) => {
    const valor = fechamentos[i];
    if (valor == null) return;
    const ms = ts * 1000;
    if (ms < inicioMs || ms > fimMs) return;
    const iso = new Date(ms).toISOString().slice(0, 10);
    pontos.push({ data: iso, valor_bruto: valor });
  });
  return pontos;
}

async function buscarYahoo(
  indicador: Indicador,
  ticker: string,
  dataInicial: string,
  dataFinal: string
): Promise<PontoIndice[]> {
  const brutos = await obterBrutosComPersistencia(indicador, dataInicial, dataFinal, (di, df) =>
    buscarSerieYahooBruto(ticker, di, df)
  );
  return brutos.map((b) => ({ data: b.data, valor: b.valor_bruto }));
}

export async function buscarSerieIndicador(
  indicador: Indicador,
  dataInicial: string,
  dataFinal: string
): Promise<PontoIndice[]> {
  const chave = `${indicador}:${dataInicial}:${dataFinal}`;
  const cache = cacheSeries.get(chave);
  if (cache && Date.now() - cache.buscadoEm < TTL_MS) {
    return cache.pontos;
  }

  let pontos: PontoIndice[];
  switch (indicador) {
    case "CDI":
      pontos = await buscarCDI(dataInicial, dataFinal);
      break;
    case "IPCA":
      pontos = await buscarIPCA(dataInicial, dataFinal);
      break;
    case "IBOV":
      pontos = await buscarYahoo("IBOV", "^BVSP", dataInicial, dataFinal);
      break;
    case "SP500":
      pontos = await buscarYahoo("SP500", "^GSPC", dataInicial, dataFinal);
      break;
  }

  cacheSeries.set(chave, { buscadoEm: Date.now(), pontos });
  return pontos;
}

/** Valor do ponto mais recente da série com data <= dataAlvo (ou o primeiro
 *  ponto disponível, se todos forem posteriores). Assume `pontos` ordenados
 *  por data crescente. */
export function valorMaisProximo(pontos: PontoIndice[], dataAlvo: string): number | null {
  let melhor: PontoIndice | null = null;
  for (const p of pontos) {
    if (p.data <= dataAlvo) melhor = p;
    else break;
  }
  if (melhor) return melhor.valor;
  return pontos[0]?.valor ?? null;
}

export const INDICADORES_VALIDOS: Indicador[] = ["CDI", "IPCA", "IBOV", "SP500"];
