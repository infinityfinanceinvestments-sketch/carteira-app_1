import { describe, expect, it } from "vitest";
import { validarForcaSenha, SENHA_MIN_CARACTERES } from "./senha";

describe("validarForcaSenha", () => {
  it("rejeita senha mais curta que o mínimo", () => {
    const erro = validarForcaSenha("ab1");
    expect(erro).toBe(`A senha precisa ter pelo menos ${SENHA_MIN_CARACTERES} caracteres.`);
  });

  it("rejeita senha só com letras (sem número)", () => {
    const erro = validarForcaSenha("somenteletras");
    expect(erro).toBe("A senha precisa ter pelo menos uma letra e um número.");
  });

  it("rejeita senha só com números (sem letra)", () => {
    const erro = validarForcaSenha("12345678");
    expect(erro).toBe("A senha precisa ter pelo menos uma letra e um número.");
  });

  it("aceita senha com letra, número e comprimento mínimo", () => {
    expect(validarForcaSenha("senha123")).toBeNull();
  });

  it("aceita acentos como letra válida", () => {
    expect(validarForcaSenha("senhaçã1")).toBeNull();
  });

  it("aceita exatamente o comprimento mínimo", () => {
    const senha = "a1234567"; // 8 caracteres
    expect(senha.length).toBe(SENHA_MIN_CARACTERES);
    expect(validarForcaSenha(senha)).toBeNull();
  });

  it("rejeita senha vazia", () => {
    expect(validarForcaSenha("")).not.toBeNull();
  });
});
