import getDb, { plainRow, plainRows } from "../db";
import type { Recado } from "../types";

/** Cria um recado novo do consultor — visível por TODOS os clientes dele
 *  (broadcast, ver comentário na tabela em lib/schema.sql). */
export function criarRecado(consultorId: number, mensagem: string): number {
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO recados (consultor_id, mensagem) VALUES (?, ?)`)
    .run(consultorId, mensagem);
  return Number(info.lastInsertRowid);
}

export function listarRecadosDoConsultor(consultorId: number, limite = 20): Recado[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(`SELECT * FROM recados WHERE consultor_id = ? ORDER BY criado_em DESC LIMIT ?`)
      .all(consultorId, limite) as unknown as Recado[]
  );
}

export function getRecadoPorId(id: number): Recado | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM recados WHERE id = ?").get(id) as Recado | undefined
  );
}

export function excluirRecado(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM recados WHERE id = ?").run(id);
}
