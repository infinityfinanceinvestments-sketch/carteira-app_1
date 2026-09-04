import getDb, { plainRow, plainRows } from "../db";
import type { Recomendacao, StatusRecomendacao } from "../types";

export function listarRecomendacoesDoCliente(clienteId: number): Recomendacao[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        "SELECT * FROM recomendacoes WHERE cliente_id = ? AND arquivada_em IS NULL ORDER BY criado_em DESC"
      )
      .all(clienteId) as unknown as Recomendacao[]
  );
}

export function listarTodasRecomendacoesPendentes(): (Recomendacao & {
  cliente_nome: string;
})[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        `SELECT r.*, c.nome as cliente_nome FROM recomendacoes r
         JOIN clientes c ON c.id = r.cliente_id
         WHERE r.status IN ('pendente','enviada')
         ORDER BY r.criado_em DESC`
      )
      .all() as unknown as (Recomendacao & { cliente_nome: string })[]
  );
}

/** "Limpar aceitas" — não apaga a recomendação (mantém histórico/auditoria),
 *  só marca como arquivada pra sumir da lista de quem já sabe o resultado.
 *  Além das aceitas, também arquiva as expiradas — outro status "resolvido"
 *  que só fica ocupando espaço na lista sem precisar de mais nenhuma ação.
 *  Devolve quantas foram arquivadas. */
export function arquivarRecomendacoesAceitas(clienteId: number): number {
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE recomendacoes SET arquivada_em = datetime('now')
       WHERE cliente_id = ? AND status IN ('aceita', 'expirada') AND arquivada_em IS NULL`
    )
    .run(clienteId);
  return Number(info.changes);
}

/** Desfaz um "limpar aceitas/expiradas" — devolve as recomendações
 *  informadas (por id) pra lista, tirando a marca de arquivada. Só mexe nas
 *  que pertencem a esse cliente e que realmente estavam arquivadas (evita
 *  desarquivar algo de outro cliente por engano, ou uma que nunca foi
 *  arquivada). Devolve quantas foram desarquivadas. */
export function desarquivarRecomendacoes(
  clienteId: number,
  ids: number[]
): number {
  if (ids.length === 0) return 0;
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const info = db
    .prepare(
      `UPDATE recomendacoes SET arquivada_em = NULL
       WHERE cliente_id = ? AND arquivada_em IS NOT NULL AND id IN (${placeholders})`
    )
    .run(clienteId, ...ids);
  return Number(info.changes);
}

export function criarRecomendacao(input: {
  cliente_id: number;
  ativo: string;
  classe: string;
  tipo_operacao: string;
  justificativa: string;
  status: string;
}): number {
  const db = getDb();
  const historico = JSON.stringify([
    { status: input.status, data: new Date().toISOString() },
  ]);
  const info = db
    .prepare(
      `INSERT INTO recomendacoes (cliente_id, ativo, classe, tipo_operacao, justificativa, status, historico_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.cliente_id,
      input.ativo,
      input.classe,
      input.tipo_operacao,
      input.justificativa,
      input.status,
      historico
    );
  return Number(info.lastInsertRowid);
}

export function getRecomendacaoPorId(id: number): Recomendacao | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM recomendacoes WHERE id = ?").get(id) as
      | Recomendacao
      | undefined
  );
}

export function atualizarStatusRecomendacao(
  id: number,
  novoStatus: StatusRecomendacao
) {
  const db = getDb();
  const atual = getRecomendacaoPorId(id);
  if (!atual) throw new Error("Recomendação não encontrada");
  const historico = JSON.parse(atual.historico_status || "[]");
  historico.push({ status: novoStatus, data: new Date().toISOString() });
  db.prepare(
    `UPDATE recomendacoes SET status = ?, historico_status = ?, atualizado_em = datetime('now') WHERE id = ?`
  ).run(novoStatus, JSON.stringify(historico), id);
}
