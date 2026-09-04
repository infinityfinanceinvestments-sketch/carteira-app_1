import getDb, { plainRows } from "../db";
import type { HistoricoPatrimonio } from "../types";

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
