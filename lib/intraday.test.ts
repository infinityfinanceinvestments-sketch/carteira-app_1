import { describe, expect, it } from "vitest";
import { precisaRegistrarPontoIntraday } from "./intraday";

// Só testa a parte pura (mesma escolha de todo o resto de lib/, ver
// vitest.config.ts) — a orquestração (`registrarSnapshotIntraday`) grava no
// banco, mesmo espírito best-effort de lib/rendaFixaIndexada.ts, que também
// não tem teste automatizado por esse motivo.
describe("precisaRegistrarPontoIntraday", () => {
  it("registra o primeiro ponto do dia, quando ainda não existe nenhum", () => {
    expect(precisaRegistrarPontoIntraday(null, new Date(), 5)).toBe(true);
  });

  it("não registra de novo se o último ponto foi há menos tempo que o throttle", () => {
    const agora = new Date("2026-09-16T14:10:00Z");
    const ultimo = "2026-09-16 14:07:00"; // 3 min atrás
    expect(precisaRegistrarPontoIntraday(ultimo, agora, 5)).toBe(false);
  });

  it("registra de novo quando já passou do throttle", () => {
    const agora = new Date("2026-09-16T14:10:00Z");
    const ultimo = "2026-09-16 14:03:00"; // 7 min atrás
    expect(precisaRegistrarPontoIntraday(ultimo, agora, 5)).toBe(true);
  });

  it("registra exatamente no limite do throttle (inclusivo)", () => {
    const agora = new Date("2026-09-16T14:10:00Z");
    const ultimo = "2026-09-16 14:05:00"; // exatamente 5 min atrás
    expect(precisaRegistrarPontoIntraday(ultimo, agora, 5)).toBe(true);
  });
});
