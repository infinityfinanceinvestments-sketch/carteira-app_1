import getDb, { plainRow } from "../db";
import type { SolicitacaoRecomendacao } from "../types";

/** Pedido do cliente pro consultor mandar uma recomendação nova. Só cria se
 *  não houver um pedido pendente ainda pra esse cliente (evita duplicar se
 *  clicar mais de uma vez) — quem chama deve checar `getSolicitacaoPendenteDoCliente`
 *  antes, esta função não faz a checagem sozinha. */
export function criarSolicitacaoRecomendacao(
  clienteId: number,
  mensagem: string | null
): number {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO solicitacoes_recomendacao (cliente_id, mensagem) VALUES (?, ?)`
    )
    .run(clienteId, mensagem);
  return Number(info.lastInsertRowid);
}

export function getSolicitacaoPendenteDoCliente(
  clienteId: number
): SolicitacaoRecomendacao | undefined {
  const db = getDb();
  return plainRow(
    db
      .prepare(
        `SELECT * FROM solicitacoes_recomendacao
         WHERE cliente_id = ? AND status = 'pendente'
         ORDER BY criado_em DESC LIMIT 1`
      )
      .get(clienteId) as SolicitacaoRecomendacao | undefined
  );
}

/** Chamada quando o consultor cria uma recomendação nova pro cliente — fecha
 *  automaticamente qualquer pedido pendente dele, sem precisar de uma ação
 *  manual extra do consultor. */
export function marcarSolicitacoesAtendidas(clienteId: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE solicitacoes_recomendacao SET status = 'atendida', atendida_em = datetime('now')
     WHERE cliente_id = ? AND status = 'pendente'`
  ).run(clienteId);
}
