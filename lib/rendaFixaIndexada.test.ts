import { describe, expect, it } from "vitest";
import { calcularFatorRendimentoCDI } from "./rendaFixaIndexada";

// Só testa a parte pura do cálculo (a mesma escolha de design de todo o
// resto de lib/: nada de banco/rede nos testes, ver vitest.config.ts) — a
// orquestração (`atualizarRendaFixaIndexada`) busca o CDI de verdade e
// grava no banco, mesmo espírito best-effort de lib/cotacoes.ts, que também
// não tem teste automatizado por esse motivo.
describe("calcularFatorRendimentoCDI", () => {
  it("pra 100% do CDI, o fator é exatamente a razão dos índices", () => {
    // CDI acumulado subiu de 100 pra 101 (1% no período) — 100% do CDI
    // rende exatamente esse 1%.
    expect(calcularFatorRendimentoCDI(100, 101, 100)).toBeCloseTo(1.01);
  });

  it("pra um percentual diferente de 100%, eleva a razão à potência do percentual", () => {
    // 110% do CDI deve render um pouco mais que os 100% do CDI no mesmo
    // período (1.01^1.1 > 1.01) — aproximação padrão de mercado pra "X% do
    // CDI" (ver comentário no topo de lib/rendaFixaIndexada.ts).
    const fator100 = calcularFatorRendimentoCDI(100, 101, 100);
    const fator110 = calcularFatorRendimentoCDI(100, 101, 110);
    expect(fator110).toBeGreaterThan(fator100);
    expect(fator110).toBeCloseTo(Math.pow(1.01, 1.1));
  });

  it("quando o índice não mudou (mesmo dia), o fator é 1 — sem crescimento", () => {
    expect(calcularFatorRendimentoCDI(100, 100, 100)).toBeCloseTo(1);
    expect(calcularFatorRendimentoCDI(100, 100, 80)).toBeCloseTo(1);
  });

  it("percentual abaixo de 100% rende menos que o CDI cheio", () => {
    const fator100 = calcularFatorRendimentoCDI(100, 101, 100);
    const fator80 = calcularFatorRendimentoCDI(100, 101, 80);
    expect(fator80).toBeLessThan(fator100);
    expect(fator80).toBeGreaterThan(1); // ainda positivo, só que menor
  });
});
