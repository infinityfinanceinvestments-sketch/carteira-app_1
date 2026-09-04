import { describe, expect, it } from "vitest";
import { valorMaisProximo } from "./indices";
import type { PontoIndice } from "./indices";

const SERIE: PontoIndice[] = [
  { data: "2026-01-05", valor: 100 },
  { data: "2026-01-10", valor: 101 },
  { data: "2026-01-20", valor: 103 },
];

describe("valorMaisProximo", () => {
  it("retorna null para série vazia", () => {
    expect(valorMaisProximo([], "2026-01-10")).toBeNull();
  });

  it("retorna o valor exato quando a data alvo bate com um ponto", () => {
    expect(valorMaisProximo(SERIE, "2026-01-10")).toBe(101);
  });

  it("retorna o ponto mais recente com data <= alvo", () => {
    expect(valorMaisProximo(SERIE, "2026-01-15")).toBe(101);
  });

  it("retorna o último ponto quando o alvo é depois de toda a série", () => {
    expect(valorMaisProximo(SERIE, "2026-02-01")).toBe(103);
  });

  it("cai para o primeiro ponto quando o alvo é anterior a toda a série", () => {
    expect(valorMaisProximo(SERIE, "2025-12-01")).toBe(100);
  });

  it("funciona com um único ponto na série", () => {
    const serieUnica: PontoIndice[] = [{ data: "2026-01-10", valor: 50 }];
    expect(valorMaisProximo(serieUnica, "2026-01-10")).toBe(50);
    expect(valorMaisProximo(serieUnica, "2026-01-01")).toBe(50);
    expect(valorMaisProximo(serieUnica, "2026-02-01")).toBe(50);
  });
});
