// Atualiza automaticamente o valor de posições de Renda Fixa marcadas pelo
// consultor como indexadas ao CDI (ex: um CDB "100% do CDI") — assim o
// patrimônio do cliente já aparece maior a cada dia que ele (ou o
// consultor) abre a carteira, sem precisar reimportar nada nem depender de
// nenhum job agendado. Mesmo espírito de `lib/cotacoes.ts` (cotação
// automática de ações/FIIs/ETFs) e `lib/rentabilidade.ts` (snapshot diário
// do histórico) — atualiza "on demand", toda vez que a carteira é aberta.
//
// Só mexe em posições com `indexador = "CDI"` (ver
// `atualizarIndexadorPosicao` em lib/repo/posicoes.ts, e a rota PATCH
// /api/clientes/[id]/posicoes/[posicaoId]) — o resto das posições de Renda
// Fixa (prefixados, IPCA+, ou sem indexador marcado) continua exatamente
// como sempre foi: só muda quando o consultor reimporta ou edita na mão.
//
// Cálculo: o fator de crescimento entre a última atualização
// (`atualizado_em`) e hoje é a razão entre o índice acumulado do CDI (base
// 100, ver lib/indices.ts) nas duas datas. Pra "X% do CDI" com X ≠ 100,
// eleva esse fator a X/100 — é a aproximação padrão do mercado pra um
// título que rende uma fração do CDI (equivalente a compor diariamente à
// taxa do CDI × X%; a diferença pro cálculo "exato" dia a dia é desprezível
// no intervalo de poucos dias entre uma abertura de carteira e outra).
//
// Nunca lança exceção — é "best effort", igual à atualização de cotações:
// se a busca do CDI falhar, as posições ficam com o último valor conhecido
// até a próxima tentativa.

import type { Posicao } from "@/lib/types";
import { atualizarValorAtualPosicao } from "@/lib/repo";
import { buscarSerieIndicador, valorMaisProximo } from "@/lib/indices";

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fator multiplicativo de crescimento pra um título que rende
 *  `percentual`% do CDI, dado o índice acumulado do CDI (base 100, ver
 *  lib/indices.ts) na data-base da posição e em hoje. Pura — sem rede nem
 *  banco — pra dar pra testar isolada do resto (busca do CDI, leitura/
 *  escrita das posições). */
export function calcularFatorRendimentoCDI(
  indiceBase: number,
  indiceHoje: number,
  percentual: number
): number {
  const fatorCDI = indiceHoje / indiceBase;
  return percentual === 100 ? fatorCDI : Math.pow(fatorCDI, percentual / 100);
}

export async function atualizarRendaFixaIndexada(posicoes: Posicao[]): Promise<void> {
  const hoje = hojeIso();
  const elegiveis = posicoes.filter(
    (p) =>
      p.classe === "Renda Fixa" &&
      p.indexador === "CDI" &&
      p.atualizado_em.slice(0, 10) < hoje
  );
  if (elegiveis.length === 0) return;

  try {
    const dataMaisAntiga = elegiveis.reduce((min, p) => {
      const data = p.atualizado_em.slice(0, 10);
      return data < min ? data : min;
    }, hoje);

    const serie = await buscarSerieIndicador("CDI", dataMaisAntiga, hoje);
    const indiceHoje = valorMaisProximo(serie, hoje);
    if (indiceHoje == null) return;

    for (const posicao of elegiveis) {
      try {
        const dataBase = posicao.atualizado_em.slice(0, 10);
        const indiceBase = valorMaisProximo(serie, dataBase);
        if (indiceBase == null || indiceBase === 0) continue;

        const percentual = posicao.indexador_percentual ?? 100;
        const fator = calcularFatorRendimentoCDI(indiceBase, indiceHoje, percentual);
        if (!Number.isFinite(fator) || fator <= 0) continue;

        const novoValor = posicao.valor_atual * fator;
        atualizarValorAtualPosicao(posicao.id, novoValor);
        posicao.valor_atual = novoValor; // reflete já nessa resposta, sem precisar reler o banco
      } catch (erro) {
        console.error(`Erro atualizando posição indexada ao CDI (id ${posicao.id})`, erro);
      }
    }
  } catch (erro) {
    console.error("Erro buscando série do CDI pra atualizar Renda Fixa indexada", erro);
  }
}
