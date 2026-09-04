import getDb, { plainRow, plainRows } from "../db";
import type { CarteiraModelo, AlocacaoAlvo } from "../types";

export function listarCarteirasModelo(): CarteiraModelo[] {
  const db = getDb();
  return plainRows(
    db.prepare("SELECT * FROM carteiras_modelo ORDER BY nome").all() as unknown as CarteiraModelo[]
  );
}

export function getCarteiraModeloPorId(id: number): CarteiraModelo | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM carteiras_modelo WHERE id = ?").get(id) as
      | CarteiraModelo
      | undefined
  );
}

export function criarCarteiraModelo(nome: string, descricao: string | null): number {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO carteiras_modelo (nome, descricao) VALUES (?, ?)")
    .run(nome, descricao);
  return Number(info.lastInsertRowid);
}

export function listarAlocacoesAlvo(carteiraModeloId: number): AlocacaoAlvo[] {
  const db = getDb();
  return plainRows(
    db
      .prepare("SELECT * FROM alocacoes_alvo WHERE carteira_modelo_id = ?")
      .all(carteiraModeloId) as unknown as AlocacaoAlvo[]
  );
}

export function substituirAlocacoesAlvo(
  carteiraModeloId: number,
  alocacoes: { classe: string; percentual_alvo: number }[]
) {
  const db = getDb();
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM alocacoes_alvo WHERE carteira_modelo_id = ?").run(
      carteiraModeloId
    );
    const stmt = db.prepare(
      "INSERT INTO alocacoes_alvo (carteira_modelo_id, classe, percentual_alvo) VALUES (?, ?, ?)"
    );
    for (const a of alocacoes) {
      stmt.run(carteiraModeloId, a.classe, a.percentual_alvo);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
