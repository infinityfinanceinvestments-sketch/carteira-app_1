// Orquestra o histórico de patrimônio do cliente: garante que hoje tenha um
// ponto registrado (pra o gráfico de evolução acumular histórico sozinho,
// sem depender do consultor reimportar posições) e, best-effort, calcula a
// série do benchmark do cliente na mesma escala em reais da carteira — pra
// as duas linhas ficarem comparáveis no mesmo gráfico.

import {
  listarHistoricoPatrimonio,
  substituirPontoHistoricoDoDia,
} from "./repo";
import {
  buscarSerieIndicador,
  valorMaisProximo,
  INDICADORES_VALIDOS,
  type Indicador,
} from "./indices";
import type { HistoricoPatrimonio } from "./types";

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Garante que o histórico do cliente tenha um ponto de hoje refletindo o
 *  valor atual da carteira (substitui se já existir um ponto de hoje) — é
 *  assim que o gráfico de evolução ganha um ponto novo por dia sem precisar
 *  de nenhum job agendado: basta o cliente ou o consultor abrir a carteira. */
export function garantirSnapshotDeHoje(clienteId: number, valorTotal: number): void {
  substituirPontoHistoricoDoDia(clienteId, hojeIso(), valorTotal);
}

export interface PontoEvolucaoComBenchmark extends HistoricoPatrimonio {
  valor_benchmark: number | null;
}

/** Busca o histórico do cliente e, se possível, calcula o valor do
 *  benchmark (CDI/IPCA/IBOV/S&P 500) reescalado pra começar no mesmo valor
 *  em reais do primeiro ponto da carteira — assim a linha pontilhada do
 *  gráfico fica na mesma escala da linha da carteira. Nunca lança exceção:
 *  se a busca do indicador falhar, devolve o histórico sem benchmark. */
export async function obterHistoricoComBenchmark(
  clienteId: number,
  benchmark: string
): Promise<PontoEvolucaoComBenchmark[]> {
  const historico = listarHistoricoPatrimonio(clienteId);
  if (historico.length < 2) return historico.map((h) => ({ ...h, valor_benchmark: null }));

  const indicador = INDICADORES_VALIDOS.includes(benchmark as Indicador)
    ? (benchmark as Indicador)
    : "CDI";

  try {
    const dataInicial = historico[0].data;
    const dataFinal = historico[historico.length - 1].data;
    const serie = await buscarSerieIndicador(indicador, dataInicial, dataFinal);
    const baseIndicador = valorMaisProximo(serie, dataInicial);
    const baseCarteira = historico[0].valor_total;
    if (baseIndicador == null || baseIndicador === 0) {
      return historico.map((h) => ({ ...h, valor_benchmark: null }));
    }
    return historico.map((h) => {
      const vi = valorMaisProximo(serie, h.data);
      return {
        ...h,
        valor_benchmark: vi != null ? (vi / baseIndicador) * baseCarteira : null,
      };
    });
  } catch (erro) {
    console.error("Erro buscando benchmark pro histórico", erro);
    return historico.map((h) => ({ ...h, valor_benchmark: null }));
  }
}

export type BenchmarksPonto = Partial<Record<Indicador, number | null>>;
export interface PontoEvolucaoMultiBenchmark extends HistoricoPatrimonio {
  benchmarks: BenchmarksPonto;
}

/** Igual a obterHistoricoComBenchmark, mas calcula os QUATRO indicadores de
 *  uma vez (CDI, IPCA, Ibovespa, S&P 500) em vez de só o benchmark
 *  configurado no cadastro do cliente — usado no seletor do gráfico de
 *  evolução, pra trocar de indicador na hora sem precisar de uma nova
 *  requisição (os dados de cada um já vêm todos calculados). Cada busca
 *  roda em paralelo e nunca lança exceção: um indicador que falhar some do
 *  objeto `benchmarks` daquele ponto (fica null), sem derrubar os outros. */
export async function obterHistoricoComTodosBenchmarks(
  clienteId: number
): Promise<PontoEvolucaoMultiBenchmark[]> {
  const historico = listarHistoricoPatrimonio(clienteId);
  if (historico.length < 2) return historico.map((h) => ({ ...h, benchmarks: {} }));

  const dataInicial = historico[0].data;
  const dataFinal = historico[historico.length - 1].data;
  const baseCarteira = historico[0].valor_total;

  const entradas = await Promise.all(
    INDICADORES_VALIDOS.map(async (indicador) => {
      try {
        const serie = await buscarSerieIndicador(indicador, dataInicial, dataFinal);
        const baseIndicador = valorMaisProximo(serie, dataInicial);
        if (baseIndicador == null || baseIndicador === 0) {
          return [indicador, null] as const;
        }
        return [indicador, { serie, baseIndicador }] as const;
      } catch (erro) {
        console.error(`Erro buscando benchmark ${indicador} pro histórico`, erro);
        return [indicador, null] as const;
      }
    })
  );

  return historico.map((h) => {
    const benchmarks: BenchmarksPonto = {};
    for (const [indicador, dados] of entradas) {
      if (!dados) {
        benchmarks[indicador] = null;
        continue;
      }
      const vi = valorMaisProximo(dados.serie, h.data);
      benchmarks[indicador] = vi != null ? (vi / dados.baseIndicador) * baseCarteira : null;
    }
    return { ...h, benchmarks };
  });
}
