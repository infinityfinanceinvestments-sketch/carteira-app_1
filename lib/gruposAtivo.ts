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
