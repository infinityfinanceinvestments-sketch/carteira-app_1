import getDb, { plainRows } from "../db";
import type { Notificacao, TipoNotificacao } from "../types";

export function listarNotificacoesDoCliente(
  clienteId: number,
  limite = 50
): Notificacao[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        "SELECT * FROM notificacoes WHERE cliente_id = ? ORDER BY criado_em DESC LIMIT ?"
      )
      .all(clienteId, limite) as unknown as Notificacao[]
  );
}

/** Novidades não lidas que merecem um popup na tela inicial do cliente (não
 *  o sino, que junta tudo) — só objetivo novo e recomendação nova, os dois
 *  tipos "acionáveis" que fazem sentido interromper o cliente na entrada do
 *  app. Outros tipos (variacao_preco, desvio_modelo, movimentacao,
 *  objetivo_concluido) continuam só no sino. */
export function listarNovidadesNaoLidas(clienteId: number): Notificacao[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        `SELECT * FROM notificacoes
         WHERE cliente_id = ? AND lida = 0 AND tipo IN ('objetivo_criado', 'recomendacao')
         ORDER BY criado_em DESC`
      )
      .all(clienteId) as unknown as Notificacao[]
  );
}

export function contarNotificacoesNaoLidas(clienteId: number): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as total FROM notificacoes WHERE cliente_id = ? AND lida = 0"
    )
    .get(clienteId) as { total: number };
  return row.total;
}

export function criarNotificacao(input: {
  cliente_id: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  referencia_id?: number | null;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO notificacoes (cliente_id, tipo, titulo, mensagem, referencia_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    input.cliente_id,
    input.tipo,
    input.titulo,
    input.mensagem,
    input.referencia_id ?? null
  );
}

/** Evita notificar o cliente várias vezes no mesmo dia sobre a mesma
 *  variação forte do mesmo ativo. */
export function jaNotificouVariacaoHoje(clienteId: number, ticker: string): boolean {
  const db = getDb();
  const hoje = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare(
      `SELECT COUNT(*) as total FROM notificacoes
       WHERE cliente_id = ? AND tipo = 'variacao_preco' AND referencia_id IS NULL
         AND titulo = ? AND criado_em >= ?`
    )
    .get(clienteId, `Variação em ${ticker}`, hoje) as { total: number };
  return row.total > 0;
}

/** Evita notificar o cliente várias vezes no mesmo dia sobre o desvio da
 *  mesma classe de ativo em relação à carteira-modelo. */
export function jaNotificouDesvioHoje(clienteId: number, classe: string): boolean {
  const db = getDb();
  const hoje = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare(
      `SELECT COUNT(*) as total FROM notificacoes
       WHERE cliente_id = ? AND tipo = 'desvio_modelo' AND referencia_id IS NULL
         AND titulo = ? AND criado_em >= ?`
    )
    .get(clienteId, `Desvio em ${classe}`, hoje) as { total: number };
  return row.total > 0;
}

export function marcarNotificacaoLida(clienteId: number, notificacaoId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE notificacoes SET lida = 1 WHERE id = ? AND cliente_id = ?"
  ).run(notificacaoId, clienteId);
}

export function marcarTodasNotificacoesLidas(clienteId: number): void {
  const db = getDb();
  db.prepare("UPDATE notificacoes SET lida = 1 WHERE cliente_id = ?").run(clienteId);
}
