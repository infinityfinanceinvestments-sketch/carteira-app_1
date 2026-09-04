import getDb, { plainRow, plainRows } from "../db";
import type { Cliente } from "../types";

export function listarClientes(): Cliente[] {
  const db = getDb();
  return plainRows(
    db.prepare("SELECT * FROM clientes ORDER BY nome ASC").all() as unknown as Cliente[]
  );
}

export function getClientePorId(id: number): Cliente | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM clientes WHERE id = ?").get(id) as
      | Cliente
      | undefined
  );
}

export function getClientePorUsuarioId(usuarioId: number): Cliente | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM clientes WHERE usuario_id = ?").get(usuarioId) as
      | Cliente
      | undefined
  );
}

export function criarCliente(input: {
  usuario_id: number;
  consultor_id: number | null;
  nome: string;
  email: string;
  perfil_risco: string;
  objetivo: string | null;
  carteira_modelo_id: number | null;
  benchmark: string;
}): number {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO clientes (usuario_id, consultor_id, nome, email, perfil_risco, objetivo, carteira_modelo_id, benchmark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.usuario_id,
      input.consultor_id,
      input.nome,
      input.email,
      input.perfil_risco,
      input.objetivo,
      input.carteira_modelo_id,
      input.benchmark
    );
  return Number(info.lastInsertRowid);
}

export function atualizarCarteiraModeloDoCliente(
  clienteId: number,
  carteiraModeloId: number | null
) {
  const db = getDb();
  db.prepare("UPDATE clientes SET carteira_modelo_id = ? WHERE id = ?").run(
    carteiraModeloId,
    clienteId
  );
}
