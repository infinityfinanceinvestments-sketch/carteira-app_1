// Dados de "mercado ao vivo" pro cliente acompanhar por conta própria:
// cotação/variação do dia dos ativos que ele favoritar, e as curvas de
// juros prefixada e do Tesouro IPCA+ (NTN-B) publicadas diariamente pelo
// Tesouro Nacional — fonte oficial, pública e sem necessidade de
// contrato/API paga com a B3 ou a ANBIMA (cujos dados de curva/NTN-B hoje
// só saem por plataformas pagas ou terminais fechados de mercado).

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// ---------- Cotações ao vivo (ações/FIIs/ETFs favoritados) ----------

const TTL_COTACAO_MS = 2 * 60 * 1000; // 2min — "ao vivo" sem martelar a Yahoo Finance

export interface CotacaoMercado {
  ticker: string;
  preco: number | null;
  variacaoPercentual: number | null;
  atualizadoEm: string;
  erro?: string;
}

interface CacheCotacao {
  buscadoEm: number;
  dado: CotacaoMercado;
}
const cacheCotacoes = new Map<string, CacheCotacao>();

async function buscarCotacaoUnica(tickerBruto: string): Promise<CotacaoMercado> {
  const ticker = tickerBruto.trim().toUpperCase();
  const cache = cacheCotacoes.get(ticker);
  if (cache && Date.now() - cache.buscadoEm < TTL_COTACAO_MS) {
    return cache.dado;
  }

  const dado: CotacaoMercado = {
    ticker,
    preco: null,
    variacaoPercentual: null,
    atualizadoEm: new Date().toISOString(),
  };
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      `${ticker}.SA`
    )}?range=5d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: false },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const preco = meta?.regularMarketPrice;
    const anterior = meta?.previousClose ?? meta?.chartPreviousClose;
    if (typeof preco === "number" && preco > 0) {
      dado.preco = preco;
      if (typeof anterior === "number" && anterior > 0) {
        dado.variacaoPercentual = ((preco - anterior) / anterior) * 100;
      }
    } else {
      dado.erro = "Ativo não encontrado — confira se o ticker está certo (ex: BBAS3).";
    }
  } catch {
    dado.erro = "Não foi possível buscar a cotação agora.";
  }

  cacheCotacoes.set(ticker, { buscadoEm: Date.now(), dado });
  return dado;
}

/** Busca cotação + variação do dia de uma lista de tickers da B3 (o mesmo
 *  ticker duas vezes só é buscado uma vez). Nunca lança exceção — cada
 *  entrada devolve seu próprio erro em `erro` quando não consegue achar o
 *  ativo, sem derrubar as outras. */
export async function buscarCotacoesMercado(tickers: string[]): Promise<CotacaoMercado[]> {
  const unicos = Array.from(
    new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))
  );
  return Promise.all(unicos.map(buscarCotacaoUnica));
}

// ---------- Curvas de juros: prefixada e Tesouro IPCA+ (NTN-B) ----------
//
// Fonte: arquivo público diário do Tesouro Direto (mesmo dado que embasa o
// site oficial tesourodireto.com.br), com o preço/taxa de compra e venda de
// cada título ofertado, por vencimento. "Tesouro Prefixado" (LTN/NTN-F) dá
// a curva de juros nominal; "Tesouro IPCA+" (NTN-B/NTN-B Principal) dá a
// curva de juros real — que é a taxa da NTN-B por vencimento que o usuário
// pediu. Atualiza algumas vezes ao longo do pregão, não tick a tick.

const TTL_CURVA_MS = 30 * 60 * 1000; // 30min

export interface PontoCurva {
  vencimento: string; // ISO yyyy-mm-dd
  taxaCompra: number;
  taxaVenda: number;
  tipo: string;
}

export interface CurvasMercado {
  atualizadoEm: string;
  dataBase: string | null;
  prefixada: PontoCurva[];
  ipcaMais: PontoCurva[];
  selic: PontoCurva[];
  erro?: string;
}

const URL_TESOURO_DIRETO =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv";

let cacheCurvas: { buscadoEm: number; dado: CurvasMercado } | null = null;

function paraDataIso(dataBr: string): string {
  const [d, m, a] = dataBr.split("/");
  if (!d || !m || !a) return dataBr;
  return `${a}-${m}-${d}`;
}

function paraNumeroBr(valor: string | undefined): number {
  if (!valor) return NaN;
  return Number(valor.replace(",", "."));
}

export async function buscarCurvaTesouroDireto(): Promise<CurvasMercado> {
  if (cacheCurvas && Date.now() - cacheCurvas.buscadoEm < TTL_CURVA_MS) {
    return cacheCurvas.dado;
  }

  try {
    const res = await fetch(URL_TESOURO_DIRETO, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: false },
      // O arquivo é o histórico completo do Tesouro Direto (todas as datas
      // desde sempre, não só hoje), então pode demorar mais que o normal
      // pra baixar — mas não pode ficar pendurado indefinidamente.
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const texto = await res.text();
    const linhas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (linhas.length < 2) throw new Error("Arquivo vazio.");

    const [cabecalho, ...resto] = linhas;
    const colunas = cabecalho.split(";").map((c) => c.trim());
    const idxTipo = colunas.indexOf("Tipo Titulo");
    const idxVencimento = colunas.indexOf("Data Vencimento");
    const idxDataBase = colunas.indexOf("Data Base");
    const idxTaxaCompra = colunas.indexOf("Taxa Compra Manha");
    const idxTaxaVenda = colunas.indexOf("Taxa Venda Manha");
    if (idxTipo < 0 || idxVencimento < 0 || idxDataBase < 0 || idxTaxaCompra < 0 || idxTaxaVenda < 0) {
      throw new Error("Formato inesperado do CSV do Tesouro Direto.");
    }

    // IMPORTANTE: esse CSV não traz só a cotação de hoje — é o histórico
    // inteiro do Tesouro Direto, com uma linha por título por dia desde
    // sempre (centenas de milhares de linhas). Sem filtrar pela data mais
    // recente, a curva sairia com o mesmo vencimento repetido uma vez por
    // dia de histórico, o que already travou o app tentando desenhar tudo
    // isso de uma vez. Por isso: primeira passada só acha a "Data Base"
    // mais recente, segunda passada usa só as linhas daquele dia.
    let dataBaseMaisRecente = "";
    for (const linha of resto) {
      const campos = linha.split(";");
      const dataBaseIso = paraDataIso(campos[idxDataBase]?.trim() ?? "");
      if (dataBaseIso > dataBaseMaisRecente) {
        dataBaseMaisRecente = dataBaseIso;
      }
    }
    if (!dataBaseMaisRecente) throw new Error("Não achei nenhuma Data Base no arquivo.");

    const prefixada: PontoCurva[] = [];
    const ipcaMais: PontoCurva[] = [];
    const selic: PontoCurva[] = [];

    for (const linha of resto) {
      const campos = linha.split(";");
      const dataBaseIso = paraDataIso(campos[idxDataBase]?.trim() ?? "");
      if (dataBaseIso !== dataBaseMaisRecente) continue; // só o dia mais recente

      const tipo = campos[idxTipo]?.trim();
      const vencimentoBr = campos[idxVencimento]?.trim();
      if (!tipo || !vencimentoBr) continue;
      const taxaCompra = paraNumeroBr(campos[idxTaxaCompra]);
      const taxaVenda = paraNumeroBr(campos[idxTaxaVenda]);
      if (!Number.isFinite(taxaCompra) || !Number.isFinite(taxaVenda)) continue;

      const ponto: PontoCurva = {
        vencimento: paraDataIso(vencimentoBr),
        taxaCompra,
        taxaVenda,
        tipo,
      };

      if (tipo.startsWith("Tesouro Prefixado")) {
        prefixada.push(ponto);
      } else if (tipo.startsWith("Tesouro IPCA+")) {
        ipcaMais.push(ponto);
      } else if (tipo.startsWith("Tesouro Selic")) {
        selic.push(ponto);
      }
    }

    const porVencimento = (a: PontoCurva, b: PontoCurva) =>
      a.vencimento.localeCompare(b.vencimento);
    prefixada.sort(porVencimento);
    ipcaMais.sort(porVencimento);
    selic.sort(porVencimento);

    const dado: CurvasMercado = {
      atualizadoEm: new Date().toISOString(),
      dataBase: dataBaseMaisRecente,
      prefixada,
      ipcaMais,
      selic,
    };
    cacheCurvas = { buscadoEm: Date.now(), dado };
    return dado;
  } catch (erro) {
    console.error("Erro buscando curva do Tesouro Direto", erro);
    // Não guarda erro no cache, pra próxima chamada tentar de novo.
    return {
      atualizadoEm: new Date().toISOString(),
      dataBase: null,
      prefixada: [],
      ipcaMais: [],
      selic: [],
      erro: "Não foi possível buscar as taxas do Tesouro Direto agora. Tente novamente em instantes.",
    };
  }
}
