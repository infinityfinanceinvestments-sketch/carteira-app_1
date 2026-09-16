import getDb, { plainRows } from "../db";
import type { HistoricoPatrimonio, PontoIntraday } from "../types";

export function listarHistoricoPatrimonio(clienteId: number): HistoricoPatrimonio[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        "SELECT * FROM historico_patrimonio WHERE cliente_id = ? ORDER BY data ASC"
      )
      .all(clienteId) as unknown as HistoricoPatrimonio[]
  );
}

export function inserirPontoHistorico(input: {
  cliente_id: number;
  data: string;
  valor_total: number;
  valor_benchmark: number | null;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO historico_patrimonio (cliente_id, data, valor_total, valor_benchmark)
     VALUES (?, ?, ?, ?)`
  ).run(input.cliente_id, input.data, input.valor_total, input.valor_benchmark);
}

export function substituirPontoHistoricoDoDia(
  clienteId: number,
  data: string,
  valorTotal: number
) {
  const db = getDb();
  db.prepare(
    "DELETE FROM historico_patrimonio WHERE cliente_id = ? AND data = ?"
  ).run(clienteId, data);
  inserirPontoHistorico({
    cliente_id: clienteId,
    data,
    valor_total: valorTotal,
    valor_benchmark: null,
  });
}

// --- Pontos intraday (ver lib/intraday.ts) ---

export function listarPontosIntradayDeHoje(clienteId: number): PontoIntraday[] {
  const db = getDb();
  const hoje = new Date().toISOString().slice(0, 10);
  return plainRows(
    db
      .prepare(
        "SELECT * FROM historico_intraday WHERE cliente_id = ? AND momento >= ? ORDER BY momento ASC"
      )
      .all(clienteId, `${hoje} 00:00:00`) as unknown as PontoIntraday[]
  );
}

export function ultimoMomentoIntraday(clienteId: number): string | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT momento FROM historico_intraday WHERE cliente_id = ? ORDER BY momento DESC LIMIT 1"
    )
    .get(clienteId) as { momento: string } | undefined;
  return row?.momento ?? null;
}

export function registrarPontoIntraday(clienteId: number, valorTotal: number): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO historico_intraday (cliente_id, valor_total) VALUES (?, ?)"
  ).run(clienteId, valorTotal);
}

/** Só interessa "hoje" pro filtro 1D — limpa qualquer coisa mais antiga que
 *  2 dias (folga pra fuso horário) pra tabela não crescer sem necessidade. */
export function limparIntradayAntigo(): void {
  const db = getDb();
  db.prepare("DELETE FROM historico_intraday WHERE momento < datetime('now', '-2 days')").run();
}
