// Busca a cotação atual de ativos negociados na B3 (ações, FIIs, ETFs) pra
// manter o valor das posições atualizado com o preço real de mercado, em vez
// de depender só do valor que o consultor digitou na hora de lançar a
// posição. Fonte: Yahoo Finance (mesmo provedor já usado em lib/indices.ts
// pro Ibovespa/S&P 500), com o sufixo ".SA" que identifica ativos da B3 lá.
//
// Cobertura da v1: só ações, FIIs e ETFs têm ticker de bolsa padronizado
// (ex: PETR4, HGLG11, IVVB11) — por isso são as únicas classes com cotação
// automática por enquanto. "Fundos" (fundos fechados/exclusivos, sem ticker
// de bolsa), "Moeda Estrangeira" e "Cripto" continuam usando o valor
// lançado manualmente pelo consultor.

import type { ClasseAtivo, Posicao } from "@/lib/types";
import { atualizarValorAtualPosicao } from "@/lib/repo";

export const CLASSES_COM_COTACAO_AUTOMATICA: ClasseAtivo[] = ["Ações", "FIIs", "ETFs"];

interface CacheEntrada {
  buscadoEm: number;
  preco: number | null;
}

const cacheCotacoes = new Map<string, CacheEntrada>();
const TTL_MS = 5 * 60 * 1000; // 5min — cotação "atual" não precisa bater a cada request

async function buscarCotacao(ticker: string): Promise<number | null> {
  const cache = cacheCotacoes.get(ticker);
  if (cache && Date.now() - cache.buscadoEm < TTL_MS) {
    return cache.preco;
  }

  let preco: number | null = null;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      `${ticker}.SA`
    )}?range=5d&interval=1d`;
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
      const meta = json?.chart?.result?.[0]?.meta;
      const valor = meta?.regularMarketPrice;
      if (typeof valor === "number" && valor > 0) {
        preco = valor;
      }
    }
  } catch {
    // Sem internet, ticker inexistente na Yahoo, etc. — degrada em silêncio,
    // quem chama fica com o valor que já tinha (lançado manualmente).
    preco = null;
  }

  cacheCotacoes.set(ticker, { buscadoEm: Date.now(), preco });
  return preco;
}

/**
 * Busca a cotação atual de cada posição elegível (Ações/FIIs/ETFs) e, quando
 * encontra um preço válido, atualiza `valor_atual` no banco (quantidade ×
 * preço atual) — o que os cálculos de valor total, alocação e rentabilidade
 * já existentes passam a refletir automaticamente. Posições sem cotação
 * disponível (erro de rede, ticker não encontrado, ou classe sem ticker de
 * bolsa) simplesmente mantêm o valor que já tinham. Nunca lança exceção —
 * essa atualização é "best effort" e não pode derrubar a tela do cliente.
 */
export async function atualizarPrecosDeMercado(posicoes: Posicao[]): Promise<void> {
  const elegiveis = posicoes.filter((p) =>
    CLASSES_COM_COTACAO_AUTOMATICA.includes(p.classe as ClasseAtivo)
  );
  if (elegiveis.length === 0) return;

  await Promise.all(
    elegiveis.map(async (posicao) => {
      try {
        const preco = await buscarCotacao(posicao.ativo);
        if (preco != null) {
          const novoValor = preco * posicao.quantidade;
          atualizarValorAtualPosicao(posicao.id, novoValor);
          posicao.valor_atual = novoValor; // reflete já nessa resposta, sem precisar reler o banco
        }
      } catch {
        // idem: uma posição com problema não pode afetar as outras.
      }
    })
  );
}
