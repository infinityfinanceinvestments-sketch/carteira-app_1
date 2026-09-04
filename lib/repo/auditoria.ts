import getDb, { plainRows } from "../db";
import type { LogAuditoria } from "../types";

export function registrarAuditoria(input: {
  cliente_id: number;
  usuario_id: number | null;
  acao: string;
  detalhes: Record<string, unknown>;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO log_auditoria (cliente_id, usuario_id, acao, detalhes)
     VALUES (?, ?, ?, ?)`
  ).run(input.cliente_id, input.usuario_id, input.acao, JSON.stringify(input.detalhes));
}

export function listarAuditoriaDoCliente(
  clienteId: number
): (LogAuditoria & { usuario_nome: string | null })[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        `SELECT l.*, u.nome as usuario_nome FROM log_auditoria l
         LEFT JOIN usuarios u ON u.id = l.usuario_id
         WHERE l.cliente_id = ?
         ORDER BY l.criado_em DESC
         LIMIT 100`
      )
      .all(clienteId) as unknown as (LogAuditoria & { usuario_nome: string | null })[]
  );
}
