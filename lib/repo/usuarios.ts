import getDb, { plainRow } from "../db";
import type { Usuario } from "../types";

export function getUsuarioPorEmail(email: string): Usuario | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email) as
      | Usuario
      | undefined
  );
}

export function getUsuarioPorId(id: number): Usuario | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as
      | Usuario
      | undefined
  );
}

export function criarUsuario(
  email: string,
  senha_hash: string,
  papel: "consultor" | "cliente",
  nome: string
): number {
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO usuarios (email, senha_hash, papel, nome) VALUES (?, ?, ?, ?)"
    )
    .run(email, senha_hash, papel, nome);
  return Number(info.lastInsertRowid);
}

export function atualizarSenhaUsuario(usuarioId: number, senhaHash: string): void {
  const db = getDb();
  db.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").run(senhaHash, usuarioId);
}
