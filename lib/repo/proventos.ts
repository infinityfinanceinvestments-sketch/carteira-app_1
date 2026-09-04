import getDb, { plainRows } from "../db";
import type { Provento, TipoProvento } from "../types";

export function listarProventosDoCliente(clienteId: number): Provento[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        "SELECT * FROM proventos WHERE cliente_id = ? ORDER BY data_pagamento DESC"
      )
      .all(clienteId) as unknown as Provento[]
  );
}

export function registrarProvento(input: {
  cliente_id: number;
  ativo: string;
  tipo: TipoProvento;
  valor: number;
  data_pagamento: string;
}): number {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO proventos (cliente_id, ativo, tipo, valor, data_pagamento)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.cliente_id, input.ativo.toUpperCase(), input.tipo, input.valor, input.data_pagamento);
  return Number(info.lastInsertRowid);
}

export function removerProvento(clienteId: number, proventoId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM proventos WHERE id = ? AND cliente_id = ?").run(
    proventoId,
    clienteId
  );
}

export function totalProventosDoCliente(clienteId: number): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(SUM(valor), 0) as total FROM proventos WHERE cliente_id = ?")
    .get(clienteId) as { total: number };
  return row.total;
}
