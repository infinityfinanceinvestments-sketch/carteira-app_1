// Lógica pura de como um aporte/retirada aprovado altera uma posição
// existente — separada de lib/repo/posicoes.ts (que faz a leitura/escrita
// no banco) pra poder ser testada sem precisar de um banco de verdade, no
// mesmo espírito de lib/intraday.ts.
//
// `preco_medio` é o custo médio POR UNIDADE e `valor_atual` é o valor TOTAL
// da posição (ver comentário em lib/repo/posicoes.ts) — as fórmulas abaixo
// preservam essa relação: quantidade * preco_medio ainda é o "custo total"
// investido depois da alteração (útil pro cálculo de ganho/perda:
// valor_atual - quantidade*preco_medio).

export interface EstadoPosicao {
  quantidade: number;
  preco_medio: number;
  valor_atual: number;
}

/** Aplica um aporte. `quantidadeAdicional` só é usado quando o cliente
 *  informou quantas unidades novas comprou (ações, FIIs, ETFs) — nesse
 *  caso o preço médio é recalculado pela média ponderada. Quando é `null`
 *  (típico de Renda Fixa, onde só existe um valor em R$), a quantidade
 *  fica igual e o custo médio sobe na mesma proporção do valor aportado,
 *  o que também cobre corretamente o caso comum de quantidade = 1. */
export function calcularAporteEmPosicao(
  estado: EstadoPosicao,
  valorAporte: number,
  quantidadeAdicional: number | null
): EstadoPosicao {
  const valor_atual = estado.valor_atual + valorAporte;

  if (quantidadeAdicional && quantidadeAdicional > 0) {
    const quantidade = estado.quantidade + quantidadeAdicional;
    const custoTotal = estado.preco_medio * estado.quantidade + valorAporte;
    const preco_medio = quantidade !== 0 ? custoTotal / quantidade : 0;
    return { quantidade, preco_medio, valor_atual };
  }

  const preco_medio =
    estado.quantidade > 0
      ? estado.preco_medio + valorAporte / estado.quantidade
      : estado.preco_medio + valorAporte;
  return { quantidade: estado.quantidade, preco_medio, valor_atual };
}

/** Aplica uma retirada. `valorRetirada` é limitado ao valor atual da
 *  posição (nunca deixa `valor_atual` negativo, mesmo que o cliente tenha
 *  informado um valor desatualizado). Quando `quantidadeRetirada` é
 *  informada, ela é subtraída direto e o custo médio por unidade fica
 *  igual (quem ficou não teve o custo alterado). Quando não é informada
 *  (Renda Fixa), a quantidade fica igual e o custo médio é reduzido na
 *  mesma proporção do valor sacado, pra manter o percentual de
 *  ganho/perda coerente com o que sobrou. Se a posição zerar (por valor
 *  ou por quantidade), `removida` vem `true` e quem chamar deve apagar a
 *  posição em vez de só atualizar. */
export function calcularRetiradaEmPosicao(
  estado: EstadoPosicao,
  valorRetirada: number,
  quantidadeRetirada: number | null
): EstadoPosicao & { removida: boolean } {
  const valorClamped = Math.min(Math.max(valorRetirada, 0), estado.valor_atual);
  const valor_atual = estado.valor_atual - valorClamped;
  const fracaoRetirada = estado.valor_atual > 0 ? valorClamped / estado.valor_atual : 1;

  let quantidade = estado.quantidade;
  let preco_medio = estado.preco_medio;

  if (quantidadeRetirada && quantidadeRetirada > 0) {
    quantidade = Math.max(0, estado.quantidade - quantidadeRetirada);
  } else {
    preco_medio = estado.preco_medio * (1 - fracaoRetirada);
  }

  // Tolerância de 1 centavo pra sobra residual de ponto flutuante não
  // deixar uma posição "fantasma" com R$ 0,00 na tela.
  const removida = valor_atual <= 0.01 || quantidade <= 0;
  if (removida) {
    return { quantidade: 0, preco_medio: 0, valor_atual: 0, removida: true };
  }
  return { quantidade, preco_medio, valor_atual, removida: false };
}
