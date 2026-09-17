// Agrupamento "enxuto" das posições pra tela de alocação do cliente (pedido
// dele: Ações, Fundos Imobiliários, Renda Fixa, Exterior, Criptoativos) —
// mais fácil de entender que as 7 classes técnicas de CLASSES_ATIVO
// (lib/types.ts), que continuam do jeito que estão porque alimentam o
// desvio vs. carteira-modelo (esse sim precisa da granularidade original).
// "Fundos" (fundos de investimento que não são FIIs) não foi citado pelo
// cliente, então vira um 6º grupo à parte em vez de ser jogado em outro
// balde errado.
import type { AlocacaoItem } from "@/components/AllocationDonut";

const MAPA_GRUPO: Record<string, string> = {
  "Ações": "Ações",
  FIIs: "Fundos Imobiliários",
  "Renda Fixa": "Renda Fixa",
  ETFs: "Exterior",
  "Moeda Estrangeira": "Exterior",
  Cripto: "Criptoativos",
  Fundos: "Fundos",
};

export function grupoDaClasse(classe: string): string {
  return MAPA_GRUPO[classe] ?? classe;
}

/** Reagrupa uma lista já somada por classe técnica (ver alocacaoPorClasse,
 *  em lib/repo/agregacoes.ts) nos grupos acima, somando valores das classes
 *  que caem no mesmo grupo (ex: ETFs + Moeda Estrangeira => Exterior) e
 *  recalculando o percentual sobre o total. */
export function agruparAlocacao(alocacao: AlocacaoItem[]): AlocacaoItem[] {
  const total = alocacao.reduce((soma, item) => soma + item.valor, 0);
  const porGrupo = new Map<string, number>();
  for (const item of alocacao) {
    const grupo = grupoDaClasse(item.classe);
    porGrupo.set(grupo, (porGrupo.get(grupo) ?? 0) + item.valor);
  }
  return [...porGrupo.entries()]
    .map(([classe, valor]) => ({
      classe,
      valor,
      percentual: total > 0 ? (valor / total) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}

/** Só os campos de `Posicao` (lib/types.ts) que entram na conta de custo e
 *  rentabilidade por grupo — evita este arquivo puro precisar importar o
 *  tipo inteiro (que arrasta lib/db.ts em cadeia se algum dia crescer). */
export interface PosicaoParaAgrupamento {
  classe: string;
  valor_atual: number;
  quantidade: number;
  preco_medio: number;
}

export interface GrupoComRentabilidade {
  grupo: string;
  valor: number;
  percentualDoTotal: number;
  /** null quando o grupo não tem custo registrado pra calcular em cima
   *  (ex: todas as posições do grupo com preco_medio zerado) — melhor não
   *  mostrar rentabilidade nenhuma do que mostrar 0%/Infinity errado. */
  rentabilidadePercentual: number | null;
}

/** Agrupa posições (já consolidadas, ver consolidarPosicoes em
 *  lib/repo/posicoes.ts) nos mesmos grupos "enxutos" de `agruparAlocacao`,
 *  mas a partir das posições individuais — porque pra calcular rentabilidade
 *  precisamos do custo de cada posição (quantidade * preco_medio), que o
 *  agregado por classe técnica (`alocacaoPorClasse`) já não carrega mais. */
export function agruparComRentabilidade(
  posicoes: PosicaoParaAgrupamento[]
): GrupoComRentabilidade[] {
  const totalValor = posicoes.reduce((soma, p) => soma + p.valor_atual, 0);
  const porGrupo = new Map<string, { valor: number; custo: number }>();
  for (const p of posicoes) {
    const grupo = grupoDaClasse(p.classe);
    const custo = p.quantidade * p.preco_medio;
    const entrada = porGrupo.get(grupo) ?? { valor: 0, custo: 0 };
    entrada.valor += p.valor_atual;
    entrada.custo += custo;
    porGrupo.set(grupo, entrada);
  }
  return [...porGrupo.entries()]
    .map(([grupo, { valor, custo }]) => ({
      grupo,
      valor,
      percentualDoTotal: totalValor > 0 ? (valor / totalValor) * 100 : 0,
      rentabilidadePercentual: custo > 0 ? ((valor - custo) / custo) * 100 : null,
    }))
    .sort((a, b) => b.valor - a.valor);
}

export interface GrupoComPosicoes<T> {
  grupo: string;
  valor: number;
  rentabilidadePercentual: number | null;
  /** Posições do grupo, ordenadas por valor atual decrescente. */
  itens: T[];
}

/** Mesmo agrupamento de `agruparComRentabilidade`, mas devolvendo também as
 *  posições individuais de cada grupo (ordenadas por valor) — usado nas
 *  telas que precisam abrir/expandir o grupo pra ver os ativos por trás do
 *  número consolidado (ver AlocacaoView.tsx e PosicoesAgrupadas.tsx). */
export function agruparPosicoesComRentabilidade<
  T extends PosicaoParaAgrupamento & { id: number },
>(posicoes: T[]): GrupoComPosicoes<T>[] {
  const porGrupo = new Map<string, T[]>();
  for (const p of posicoes) {
    const grupo = grupoDaClasse(p.classe);
    if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
    porGrupo.get(grupo)!.push(p);
  }
  const rentabilidades = new Map(
    agruparComRentabilidade(posicoes).map((g) => [g.grupo, g])
  );
  return [...porGrupo.entries()]
    .map(([grupo, itens]) => {
      const info = rentabilidades.get(grupo)!;
      return {
        grupo,
        valor: info.valor,
        rentabilidadePercentual: info.rentabilidadePercentual,
        itens: itens.slice().sort((a, b) => b.valor_atual - a.valor_atual),
      };
    })
    .sort((a, b) => b.valor - a.valor);
}
