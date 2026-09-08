import { describe, expect, it } from "vitest";
import { gerarCodigoNumerico, hashComSegredo } from "./dois-fatores";

// Só a lógica pura (geração de código e hash) — nada de banco aqui, seguindo
// o mesmo critério do resto do projeto (ver vitest.config.mts): testes
// rápidos e determinísticos, sem precisar de um data.db pra rodar.

describe("gerarCodigoNumerico", () => {
  it("sempre gera 6 dígitos numéricos", () => {
    for (let i = 0; i < 200; i++) {
      const codigo = gerarCodigoNumerico();
      expect(codigo).toMatch(/^\d{6}$/);
    }
  });

  it("não trava sempre no mesmo valor (tem variação real)", () => {
    const valores = new Set(Array.from({ length: 50 }, () => gerarCodigoNumerico()));
    expect(valores.size).toBeGreaterThan(1);
  });
});

describe("hashComSegredo", () => {
  it("é determinístico para o mesmo valor", () => {
    expect(hashComSegredo("123456")).toBe(hashComSegredo("123456"));
  });

  it("gera hashes diferentes para códigos diferentes", () => {
    expect(hashComSegredo("123456")).not.toBe(hashComSegredo("654321"));
  });

  it("nunca devolve o valor original em texto puro", () => {
    expect(hashComSegredo("123456")).not.toContain("123456");
  });
});
