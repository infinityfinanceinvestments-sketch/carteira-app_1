import getDb, { plainRow } from "../db";
import type { TermoAceite } from "../types";

export function getAceiteTermos(
  usuarioId: number,
  versao: string
): TermoAceite | undefined {
  const db = getDb();
  return plainRow(
    db
      .prepare(
        "SELECT * FROM termos_aceites WHERE usuario_id = ? AND versao = ?"
      )
      .get(usuarioId, versao) as TermoAceite | undefined
  );
}

/** Idempotente: aceitar de novo a mesma versão não duplica nem dá erro. */
export function registrarAceiteTermos(usuarioId: number, versao: string): void {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO termos_aceites (usuario_id, versao) VALUES (?, ?)"
  ).run(usuarioId, versao);
}
