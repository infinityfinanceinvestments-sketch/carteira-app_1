import getDb, { plainRow, plainRows } from "../db";
import type { FavoritoMercado } from "../types";

export function listarFavoritosDoCliente(clienteId: number): FavoritoMercado[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        "SELECT * FROM favoritos_mercado WHERE cliente_id = ? ORDER BY criado_em ASC"
      )
      .all(clienteId) as unknown as FavoritoMercado[]
  );
}

/** Idempotente: adicionar um ticker já favoritado não duplica (UNIQUE no
 *  schema) nem dá erro — só devolve o favorito já existente. */
export function adicionarFavorito(clienteId: number, ticker: string): FavoritoMercado {
  const db = getDb();
  const tickerNormalizado = ticker.trim().toUpperCase();
  db.prepare(
    "INSERT OR IGNORE INTO favoritos_mercado (cliente_id, ticker) VALUES (?, ?)"
  ).run(clienteId, tickerNormalizado);
  const favorito = db
    .prepare(
      "SELECT * FROM favoritos_mercado WHERE cliente_id = ? AND ticker = ?"
    )
    .get(clienteId, tickerNormalizado) as unknown as FavoritoMercado;
  return plainRow(favorito);
}

export function removerFavorito(clienteId: number, ticker: string): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM favoritos_mercado WHERE cliente_id = ? AND ticker = ?"
  ).run(clienteId, ticker.trim().toUpperCase());
}
