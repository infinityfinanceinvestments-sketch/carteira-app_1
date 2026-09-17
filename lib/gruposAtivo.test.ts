import { describe, expect, it } from "vitest";
import {
  agruparAlocacao,
  agruparComRentabilidade,
  agruparPosicoesComRentabilidade,
  grupoDaClasse,
} from "./gruposAtivo";

describe("grupoDaClasse", () => {
  it("mapeia as classes técnicas pros grupos enxutos pedidos pelo cliente", () => {
    expect(grupoDaClasse("Ações")).toBe("Ações");
    expect(grupoDaClasse("FIIs")).toBe("Fundos Imobiliários");
    expect(grupoDaClasse("ETFs")).toBe("Exterior");
    expect(grupoDaClasse("Moeda Estrangeira")).toBe("Exterior");
    expect(grupoDaClasse("Cripto")).toBe("Criptoativos");
    expect(grupoDaClasse("Fundos")).toBe("Fundos");
  });

  it("devolve a própria classe quando não há mapeamento (fallback seguro)", () => {
    expect(grupoDaClasse("Classe Desconhecida")).toBe("Classe Desconhecida");
  });
});

describe("agruparAlocacao", () => {
  it("soma classes que caem no mesmo grupo e recalcula o percentual", () => {
    const resultado = agruparAlocacao([
      { classe: "ETFs", valor: 100, percentual: 0 },
      { classe: "Moeda Estrangeira", valor: 100, percentual: 0 },
      { classe: "Ações", valor: 200, percentual: 0 },
    ]);
    // Empate de valor (200 = 200): a ordem entre os dois não importa pro
    // teste, só que a soma e o percentual de cada grupo estejam corretos.
    expect(resultado).toHaveLength(2);
    expect(resultado).toEqual(
      expect.arrayContaining([
        { classe: "Ações", valor: 200, percentual: 50 },
        { classe: "Exterior", valor: 200, percentual: 50 },
      ])
    );
  });

  it("não quebra com lista vazia", () => {
    expect(agruparAlocacao([])).toEqual([]);
  });
});

describe("agruparComRentabilidade", () => {
  it("calcula valor, percentual do total e rentabilidade por grupo", () => {
    const resultado = agruparComRentabilidade([
      // Ações: custo 100*10=1000, valor 1200 -> +20%
      { classe: "Ações", quantidade: 100, preco_medio: 10, valor_atual: 1200 },
      // Renda Fixa (quantidade=1, preco_medio=custo total): custo 1000, valor 900 -> -10%
      { classe: "Renda Fixa", quantidade: 1, preco_medio: 1000, valor_atual: 900 },
    ]);

    expect(resultado).toHaveLength(2);
    const acoes = resultado.find((g) => g.grupo === "Ações")!;
    expect(acoes.valor).toBe(1200);
    expect(acoes.rentabilidadePercentual).toBeCloseTo(20);
    expect(acoes.percentualDoTotal).toBeCloseTo((1200 / 2100) * 100);

    const rendaFixa = resultado.find((g) => g.grupo === "Renda Fixa")!;
    expect(rendaFixa.valor).toBe(900);
    expect(rendaFixa.rentabilidadePercentual).toBeCloseTo(-10);
  });

  it("soma posições de classes diferentes que caem no mesmo grupo (ex: ETFs + Moeda Estrangeira -> Exterior)", () => {
    const resultado = agruparComRentabilidade([
      { classe: "ETFs", quantidade: 10, preco_medio: 10, valor_atual: 120 },
      { classe: "Moeda Estrangeira", quantidade: 1, preco_medio: 50, valor_atual: 55 },
    ]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].grupo).toBe("Exterior");
    expect(resultado[0].valor).toBe(175);
    // custo total = 100 + 50 = 150, valor = 175 -> +16,67%
    expect(resultado[0].rentabilidadePercentual).toBeCloseTo(((175 - 150) / 150) * 100);
  });

  it("devolve rentabilidade null quando o grupo não tem custo (preco_medio zerado)", () => {
    const resultado = agruparComRentabilidade([
      { classe: "Ações", quantidade: 10, preco_medio: 0, valor_atual: 500 },
    ]);
    expect(resultado[0].rentabilidadePercentual).toBeNull();
  });

  it("não quebra com lista vazia", () => {
    expect(agruparComRentabilidade([])).toEqual([]);
  });

  it("ordena por valor decrescente", () => {
    const resultado = agruparComRentabilidade([
      { classe: "Ações", quantidade: 1, preco_medio: 10, valor_atual: 10 },
      { classe: "Renda Fixa", quantidade: 1, preco_medio: 100, valor_atual: 100 },
    ]);
    expect(resultado.map((g) => g.grupo)).toEqual(["Renda Fixa", "Ações"]);
  });
});

describe("agruparPosicoesComRentabilidade", () => {
  const posicoes = [
    { id: 1, classe: "Ações", quantidade: 100, preco_medio: 10, valor_atual: 1200 },
    { id: 2, classe: "Ações", quantidade: 10, preco_medio: 5, valor_atual: 40 },
    { id: 3, classe: "ETFs", quantidade: 10, preco_medio: 10, valor_atual: 90 },
  ];

  it("agrupa as posições, mantendo os itens individuais dentro de cada grupo", () => {
    const resultado = agruparPosicoesComRentabilidade(posicoes);
    expect(resultado.map((g) => g.grupo)).toEqual(["Ações", "Exterior"]);

    const acoes = resultado.find((g) => g.grupo === "Ações")!;
    expect(acoes.valor).toBe(1240);
    expect(acoes.itens.map((p) => p.id)).toEqual([1, 2]); // ordenado por valor decrescente
    // custo total = 1000 + 50 = 1050, valor = 1240
    expect(acoes.rentabilidadePercentual).toBeCloseTo(((1240 - 1050) / 1050) * 100);

    const exterior = resultado.find((g) => g.grupo === "Exterior")!;
    expect(exterior.itens.map((p) => p.id)).toEqual([3]);
  });

  it("bate com o valor e a rentabilidade de agruparComRentabilidade pro mesmo grupo", () => {
    const comItens = agruparPosicoesComRentabilidade(posicoes);
    const soRentabilidade = agruparComRentabilidade(posicoes);
    for (const grupo of comItens) {
      const equivalente = soRentabilidade.find((g) => g.grupo === grupo.grupo)!;
      expect(grupo.valor).toBe(equivalente.valor);
      expect(grupo.rentabilidadePercentual).toBe(equivalente.rentabilidadePercentual);
    }
  });

  it("não quebra com lista vazia", () => {
    expect(agruparPosicoesComRentabilidade([])).toEqual([]);
  });
});
