import { describe, expect, it } from "vitest";
import { calcularAporteEmPosicao, calcularRetiradaEmPosicao } from "./movimentacoes";

describe("calcularAporteEmPosicao", () => {
  it("aporte em ativo com quantidade (ação) recalcula o preço médio ponderado", () => {
    // Tinha 10 ações a R$ 20 (custo total R$ 200), comprou mais 10 a R$ 30
    // (aportou R$ 300) — custo total novo R$ 500 / 20 ações = R$ 25.
    const novo = calcularAporteEmPosicao(
      { quantidade: 10, preco_medio: 20, valor_atual: 250 },
      300,
      10
    );
    expect(novo.quantidade).toBe(20);
    expect(novo.preco_medio).toBeCloseTo(25);
    expect(novo.valor_atual).toBeCloseTo(550);
  });

  it("aporte só em valor (Renda Fixa) mantém a quantidade e soma ao custo médio", () => {
    // Renda Fixa típica: quantidade = 1, preco_medio = custo total.
    const novo = calcularAporteEmPosicao(
      { quantidade: 1, preco_medio: 1000, valor_atual: 1050 },
      500,
      null
    );
    expect(novo.quantidade).toBe(1);
    expect(novo.preco_medio).toBeCloseTo(1500);
    expect(novo.valor_atual).toBeCloseTo(1550);
  });

  it("aporte só em valor com quantidade > 1 distribui o custo proporcionalmente", () => {
    const novo = calcularAporteEmPosicao(
      { quantidade: 10, preco_medio: 20, valor_atual: 250 },
      100,
      null
    );
    expect(novo.quantidade).toBe(10);
    // custo total novo = 200 + 100 = 300 / 10 = 30
    expect(novo.preco_medio).toBeCloseTo(30);
    expect(novo.valor_atual).toBeCloseTo(350);
  });
});

describe("calcularRetiradaEmPosicao", () => {
  it("retirada parcial com quantidade mantém o preço médio de quem ficou", () => {
    const novo = calcularRetiradaEmPosicao(
      { quantidade: 20, preco_medio: 25, valor_atual: 550 },
      275, // metade do valor
      10 // metade das unidades
    );
    expect(novo.removida).toBe(false);
    expect(novo.quantidade).toBe(10);
    expect(novo.preco_medio).toBeCloseTo(25);
    expect(novo.valor_atual).toBeCloseTo(275);
  });

  it("retirada parcial só em valor (Renda Fixa) reduz o custo médio proporcionalmente", () => {
    const novo = calcularRetiradaEmPosicao(
      { quantidade: 1, preco_medio: 1500, valor_atual: 1550 },
      775, // metade do valor atual
      null
    );
    expect(novo.removida).toBe(false);
    expect(novo.quantidade).toBe(1);
    expect(novo.preco_medio).toBeCloseTo(750);
    expect(novo.valor_atual).toBeCloseTo(775);
  });

  it("retirada total (por valor) zera e marca a posição como removida", () => {
    const novo = calcularRetiradaEmPosicao(
      { quantidade: 1, preco_medio: 1500, valor_atual: 1550 },
      1550,
      null
    );
    expect(novo.removida).toBe(true);
    expect(novo.valor_atual).toBe(0);
  });

  it("retirada total (por quantidade) zera e marca a posição como removida", () => {
    const novo = calcularRetiradaEmPosicao(
      { quantidade: 10, preco_medio: 25, valor_atual: 275 },
      275,
      10
    );
    expect(novo.removida).toBe(true);
  });

  it("retirada maior que o valor atual é limitada ao valor disponível (nunca fica negativo)", () => {
    const novo = calcularRetiradaEmPosicao(
      { quantidade: 1, preco_medio: 1000, valor_atual: 1000 },
      5000, // valor desatualizado/maior que o disponível
      null
    );
    expect(novo.removida).toBe(true);
    expect(novo.valor_atual).toBe(0);
  });
});
