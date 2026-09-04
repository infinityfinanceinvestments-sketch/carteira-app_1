import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verificarLimite, registrarFalha, identificarOrigem } from "./rate-limit";

// Cada teste usa uma chave única (com o próprio nome do teste) pra não
// compartilhar estado com os outros — o limitador guarda tudo numa Map em
// memória a nível de módulo, então chaves iguais entre testes colidiriam.
function chaveUnica(sufixo: string) {
  return `teste:${sufixo}:${Math.random()}`;
}

describe("verificarLimite / registrarFalha", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite quando não há tentativas registradas ainda", () => {
    const chave = chaveUnica("sem-tentativas");
    const resultado = verificarLimite(chave, 3, 60_000);
    expect(resultado.permitido).toBe(true);
  });

  it("permite enquanto o número de falhas está abaixo do máximo", () => {
    const chave = chaveUnica("abaixo-do-maximo");
    registrarFalha(chave, 60_000);
    registrarFalha(chave, 60_000);
    const resultado = verificarLimite(chave, 3, 60_000);
    expect(resultado.permitido).toBe(true);
  });

  it("bloqueia assim que atinge o máximo de tentativas na janela", () => {
    const chave = chaveUnica("atingiu-maximo");
    registrarFalha(chave, 60_000);
    registrarFalha(chave, 60_000);
    registrarFalha(chave, 60_000);
    const resultado = verificarLimite(chave, 3, 60_000);
    expect(resultado.permitido).toBe(false);
    expect(resultado.retryApósSegundos).toBeGreaterThan(0);
  });

  it("libera de novo depois que a janela expira", () => {
    const chave = chaveUnica("janela-expira");
    const janelaMs = 60_000;
    registrarFalha(chave, janelaMs);
    registrarFalha(chave, janelaMs);
    registrarFalha(chave, janelaMs);
    expect(verificarLimite(chave, 3, janelaMs).permitido).toBe(false);

    vi.advanceTimersByTime(janelaMs + 1);

    expect(verificarLimite(chave, 3, janelaMs).permitido).toBe(true);
  });

  it("retryApósSegundos diminui conforme o tempo passa dentro da janela", () => {
    const chave = chaveUnica("retry-diminui");
    const janelaMs = 60_000;
    registrarFalha(chave, janelaMs);
    registrarFalha(chave, janelaMs);
    registrarFalha(chave, janelaMs);

    const primeiraChecagem = verificarLimite(chave, 3, janelaMs);
    vi.advanceTimersByTime(30_000);
    const segundaChecagem = verificarLimite(chave, 3, janelaMs);

    expect(segundaChecagem.retryApósSegundos).toBeLessThan(primeiraChecagem.retryApósSegundos);
  });
});

describe("identificarOrigem", () => {
  function requisicaoCom(headers: Record<string, string | null>) {
    return {
      headers: {
        get: (name: string) => headers[name] ?? null,
      },
    };
  }

  it("usa o primeiro IP de x-forwarded-for quando presente", () => {
    const req = requisicaoCom({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(identificarOrigem(req)).toBe("203.0.113.5");
  });

  it("cai para x-real-ip quando x-forwarded-for não existe", () => {
    const req = requisicaoCom({ "x-real-ip": "198.51.100.7" });
    expect(identificarOrigem(req)).toBe("198.51.100.7");
  });

  it("usa um valor fixo quando nenhum header de IP está presente", () => {
    const req = requisicaoCom({});
    expect(identificarOrigem(req)).toBe("origem-desconhecida");
  });
});
