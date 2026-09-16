import getDb, { plainRow, plainRows } from "../db";
import type { MovimentacaoPendente, StatusMovimentacao, TipoMovimentacao } from "../types";

export function criarMovimentacaoPendente(input: {
  cliente_id: number;
  tipo: TipoMovimentacao;
  posicao_id: number | null;
  ativo: string;
  classe: string;
  quantidade: number | null;
  valor: number;
  observacao: string | null;
}): number {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO movimentacoes_pendentes
        (cliente_id, tipo, posicao_id, ativo, classe, quantidade, valor, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.cliente_id,
      input.tipo,
      input.posicao_id,
      input.ativo,
      input.classe,
      input.quantidade,
      input.valor,
      input.observacao
    );
  return Number(info.lastInsertRowid);
}

export function listarMovimentacoesDoCliente(clienteId: number): MovimentacaoPendente[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        "SELECT * FROM movimentacoes_pendentes WHERE cliente_id = ? ORDER BY criado_em DESC"
      )
      .all(clienteId) as unknown as MovimentacaoPendente[]
  );
}

/** Movimentações pendentes de TODOS os clientes — usado no dashboard do
 *  consultor, mesmo padrão de `listarTodasRecomendacoesPendentes`. */
export function listarTodasMovimentacoesPendentes(): (MovimentacaoPendente & {
  cliente_nome: string;
})[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        `SELECT m.*, c.nome as cliente_nome FROM movimentacoes_pendentes m
         JOIN clientes c ON c.id = m.cliente_id
         WHERE m.status = 'pendente'
         ORDER BY m.criado_em DESC`
      )
      .all() as unknown as (MovimentacaoPendente & { cliente_nome: string })[]
  );
}

export function getMovimentacaoPorId(id: number): MovimentacaoPendente | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM movimentacoes_pendentes WHERE id = ?").get(id) as
      | MovimentacaoPendente
      | undefined
  );
}

/** Marca a movimentação como aprovada/recusada. Só grava a decisão — quem
 *  chama é responsável por já ter aplicado (ou não) o efeito em `posicoes`
 *  antes (ver aplicarAporteEmPosicao/aplicarRetiradaEmPosicao em
 *  lib/repo/posicoes.ts e a orquestração no PATCH de
 *  app/api/clientes/[id]/movimentacoes/[movId]). */
export function responderMovimentacaoPendente(
  id: number,
  status: Exclude<StatusMovimentacao, "pendente">,
  notaConsultor: string | null
): void {
  const db = getDb();
  db.prepare(
    `UPDATE movimentacoes_pendentes SET status = ?, nota_consultor = ?, respondida_em = datetime('now') WHERE id = ?`
  ).run(status, notaConsultor, id);
}
