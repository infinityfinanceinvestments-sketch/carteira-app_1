// Busca automática de proventos (dividendos/JCP/rendimentos) direto na Yahoo
// Finance, pra não depender só do lançamento manual do consultor a cada
// pagamento. Mesma fonte e convenções já usadas em lib/cotacoes.ts (sufixo
// ".SA" pros tickers da B3) e lib/indices.ts (endpoint de chart da Yahoo).
//
// Cobertura: só ações, FIIs e ETFs têm ticker de bolsa padronizado — são as
// únicas classes verificadas aqui (mesmo recorte de lib/cotacoes.ts).
//
// Limitações honestas dessa v1:
//  - A Yahoo não distingue "dividendo" de "JCP" no evento de provento, então
//    classificamos por classe do ativo: FIIs vira "rendimento", Ações e
//    ETFs viram "dividendo" — pode ocasionalmente ser JCP rotulado como
//    dividendo (mesmo valor líquido, só o rótulo que pode não bater 100%).
//  - O valor total (valor por cota × quantidade) usa a quantidade ATUAL da
//    posição, não a quantidade que o cliente tinha na data-com do pagamento.
//    Pra a maioria dos casos (carteira que não muda muito) fica correto; se
//    o cliente comprou/vendeu bastante do ativo, o valor de pagamentos
//    antigos pode ficar impreciso. Ainda assim, uma estimativa automática
//    erra menos — e dá muito menos trabalho — do que depender 100% de
//    lançamento manual.
//  - É "best effort": qualquer erro (rede, ticker sem dado, etc.) é
//    ignorado em silêncio e nunca derruba a tela do cliente.

import type { ClasseAtivo, Posicao, TipoProvento } from "@/lib/types";
import { listarProventosDoCliente, registrarProvento } from "@/lib/repo";

export const CLASSES_COM_PROVENTO_AUTOMATICO: ClasseAtivo[] = ["Ações", "FIIs", "ETFs"];

interface EventoProvento {
  data: string; // yyyy-MM-dd
  valorPorCota: number;
}

interface CacheEntrada {
  buscadoEm: number;
  eventos: EventoProvento[];
}

const cacheProventos = new Map<string, CacheEntrada>();
const TTL_MS = 12 * 60 * 60 * 1000; // 12h — mesmo TTL usado pras séries de índices

function tipoParaClasse(classe: string): TipoProvento {
  if (classe === "FIIs") return "rendimento";
  return "dividendo";
}

async function buscarEventosYahoo(ticker: string): Promise<EventoProvento[]> {
  const cache = cacheProventos.get(ticker);
  if (cache && Date.now() - cache.buscadoEm < TTL_MS) {
    return cache.eventos;
  }

  let eventos: EventoProvento[] = [];
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      `${ticker}.SA`
    )}?range=2y&interval=1d&events=div`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      next: { revalidate: false },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      const json = await res.json();
      const dividends = json?.chart?.result?.[0]?.events?.dividends as
        | Record<string, { amount: number; date: number }>
        | undefined;
      if (dividends) {
        eventos = Object.values(dividends)
          .filter((d) => typeof d.amount === "number" && d.amount > 0 && typeof d.date === "number")
          .map((d) => ({
            data: new Date(d.date * 1000).toISOString().slice(0, 10),
            valorPorCota: d.amount,
          }));
      }
    }
  } catch {
    // sem internet, ticker sem dado de proventos na Yahoo, etc.
    eventos = [];
  }

  cacheProventos.set(ticker, { buscadoEm: Date.now(), eventos });
  return eventos;
}

/**
 * Busca proventos recentes (últimos ~2 anos) de cada posição elegível e
 * lança automaticamente no cliente os que ainda não existem — checagem por
 * ativo+data, pra não duplicar o que o consultor já tiver lançado
 * manualmente (ou o que uma sincronização anterior já tiver inserido).
 * `posicoes` deve ser a lista CONSOLIDADA (uma linha por ativo, quantidade
 * somada entre contas) pra não subcontar quando o mesmo ativo aparece em
 * mais de uma conta.
 */
export async function sincronizarProventosAutomaticos(
  clienteId: number,
  posicoes: Posicao[]
): Promise<void> {
  const elegiveis = posicoes.filter((p) =>
    CLASSES_COM_PROVENTO_AUTOMATICO.includes(p.classe as ClasseAtivo)
  );
  if (elegiveis.length === 0) return;

  const jaLancados = new Set(
    listarProventosDoCliente(clienteId).map((p) => `${p.ativo}::${p.data_pagamento}`)
  );

  await Promise.all(
    elegiveis.map(async (posicao) => {
      try {
        const eventos = await buscarEventosYahoo(posicao.ativo);
        for (const evento of eventos) {
          const chave = `${posicao.ativo}::${evento.data}`;
          if (jaLancados.has(chave)) continue;
          const valorTotal = evento.valorPorCota * posicao.quantidade;
          if (valorTotal <= 0) continue;
          registrarProvento({
            cliente_id: clienteId,
            ativo: posicao.ativo,
            tipo: tipoParaClasse(posicao.classe),
            valor: valorTotal,
            data_pagamento: evento.data,
          });
          jaLancados.add(chave); // evita duplicar se o loop repetir o mesmo ativo
        }
      } catch {
        // uma posição com problema (ticker sem dado, etc.) não pode afetar as outras.
      }
    })
  );
}
