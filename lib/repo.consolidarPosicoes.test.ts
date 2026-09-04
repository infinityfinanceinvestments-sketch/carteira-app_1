import { describe, expect, it } from "vitest";
import { consolidarPosicoes } from "./repo";
import type { Posicao } from "./types";

// consolidarPosicoes é a única função de lib/repo.ts que não toca o banco
// (só agrupa um array já carregado) — por isso dá pra testar isolada, sem
// precisar de um data.db. As outras funções do arquivo chamam getDb()
// internamente e ficam de fora dos testes automatizados por enquanto.

function posicao(overrides: Partial<Posicao>): Posicao {
  return {
    id: 1,
    conta_id: 1,
    ativo: "PETR4",
    classe: "Renda Variável",
    quantidade: 100,
    preco_medio: 30,
    valor_atual: 3200,
    atualizado_em: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("consolidarPosicoes", () => {
  it("retorna lista vazia para entrada vazia", () => {
    expect(consolidarPosicoes([])).toEqual([]);
  });

  it("mantém uma posição única sem alterações relevantes", () => {
    const p = posicao({});
    const [resultado] = consolidarPosicoes([p]);
    expect(resultado.ativo).toBe("PETR4");
    expect(resultado.quantidade).toBe(100);
    expect(resultado.valor_atual).toBe(3200);
    expect(resultado.preco_medio).toBe(30);
  });

  it("soma quantidade e valor_atual de duas posições do mesmo ativo em contas diferentes", () => {
    const p1 = posicao({ id: 1, conta_id: 1, quantidade: 100, preco_medio: 30, valor_atual: 3200 });
    const p2 = posicao({ id: 2, conta_id: 2, quantidade: 50, preco_medio: 28, valor_atual: 1600 });
    const [resultado] = consolidarPosicoes([p1, p2]);

    expect(resultado.quantidade).toBe(150);
    expect(resultado.valor_atual).toBe(4800);
    // preço médio consolidado = custo total / quantidade total
    const custoTotal = 100 * 30 + 50 * 28;
    expect(resultado.preco_medio).toBeCloseTo(custoTotal / 150);
  });

  it("não mistura o mesmo ticker em classes diferentes", () => {
    const p1 = posicao({ id: 1, ativo: "KNRI11", classe: "Fundos Imobiliários" });
    const p2 = posicao({ id: 2, ativo: "KNRI11", classe: "Renda Variável" });
    const resultado = consolidarPosicoes([p1, p2]);
    expect(resultado).toHaveLength(2);
  });

  it("normaliza o ticker (case/espaços) ao agrupar", () => {
    const p1 = posicao({ id: 1, ativo: "petr4", quantidade: 100, valor_atual: 3200 });
    const p2 = posicao({ id: 2, ativo: " PETR4 ", quantidade: 50, valor_atual: 1600 });
    const resultado = consolidarPosicoes([p1, p2]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade).toBe(150);
  });

  it("mantém a data de atualização mais recente entre as posições agrupadas", () => {
    const p1 = posicao({ id: 1, atualizado_em: "2026-01-01T10:00:00.000Z" });
    const p2 = posicao({ id: 2, atualizado_em: "2026-02-01T10:00:00.000Z" });
    const [resultado] = consolidarPosicoes([p1, p2]);
    expect(resultado.atualizado_em).toBe("2026-02-01T10:00:00.000Z");
  });

  it("não divide por zero quando a quantidade total consolidada é zero", () => {
    const p1 = posicao({ id: 1, quantidade: 100, preco_medio: 30 });
    const p2 = posicao({ id: 2, quantidade: -100, preco_medio: 30 });
    const [resultado] = consolidarPosicoes([p1, p2]);
    expect(resultado.quantidade).toBe(0);
    expect(resultado.preco_medio).toBe(0);
  });
});
