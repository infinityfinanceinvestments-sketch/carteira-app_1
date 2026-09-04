import getDb, { plainRow, plainRows } from "../db";
import type { Objetivo, ObjetivoComProgresso } from "../types";
import { listarPosicoesDoCliente, consolidarPosicoes } from "./posicoes";
import { criarNotificacao } from "./notificacoes";

// ---------- CRUD ----------

export function listarObjetivosDoCliente(clienteId: number): Objetivo[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        `SELECT * FROM objetivos WHERE cliente_id = ? ORDER BY concluido_em IS NOT NULL, criado_em DESC`
      )
      .all(clienteId) as unknown as Objetivo[]
  );
}

export function getObjetivoPorId(id: number): Objetivo | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM objetivos WHERE id = ?").get(id) as Objetivo | undefined
  );
}

export function criarObjetivo(input: {
  cliente_id: number;
  titulo: string;
  descricao?: string | null;
  tipo: "quantidade_ativo" | "valor_livre";
  ativo?: string | null;
  meta_quantidade?: number | null;
  meta_valor?: number | null;
}): number {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO objetivos (cliente_id, titulo, descricao, tipo, ativo, meta_quantidade, meta_valor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.cliente_id,
      input.titulo,
      input.descricao ?? null,
      input.tipo,
      input.ativo ?? null,
      input.meta_quantidade ?? null,
      input.meta_valor ?? null
    );
  return Number(info.lastInsertRowid);
}

export function atualizarObjetivo(
  id: number,
  input: {
    titulo?: string;
    descricao?: string | null;
    ativo?: string | null;
    meta_quantidade?: number | null;
    meta_valor?: number | null;
    progresso_manual?: number;
  }
): void {
  const db = getDb();
  const atual = getObjetivoPorId(id);
  if (!atual) return;
  db.prepare(
    `UPDATE objetivos SET
       titulo = ?, descricao = ?, ativo = ?, meta_quantidade = ?, meta_valor = ?, progresso_manual = ?,
       atualizado_em = datetime('now')
     WHERE id = ?`
  ).run(
    input.titulo ?? atual.titulo,
    input.descricao !== undefined ? input.descricao : atual.descricao,
    input.ativo !== undefined ? input.ativo : atual.ativo,
    input.meta_quantidade !== undefined ? input.meta_quantidade : atual.meta_quantidade,
    input.meta_valor !== undefined ? input.meta_valor : atual.meta_valor,
    input.progresso_manual !== undefined ? input.progresso_manual : atual.progresso_manual,
    id
  );
}

export function excluirObjetivo(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM objetivos WHERE id = ?").run(id);
}

/** Marca (ou desmarca) `concluido_em` — chamada depois de recalcular o
 *  progresso, nunca embutida na query de leitura, pra não gravar a cada
 *  GET. Idempotente: não regrava se o estado já é o desejado. Ao marcar
 *  como concluído pela primeira vez, também cria uma notificação in-app
 *  pro cliente (reaproveitando o sino que já existe) — não notifica de
 *  novo ao desmarcar (ex: cliente vendeu parte da posição), só quando
 *  bate a meta. */
function definirConclusao(objetivo: Objetivo, concluido: boolean): void {
  const jaConcluido = objetivo.concluido_em !== null;
  if (concluido === jaConcluido) return;
  const db = getDb();
  db.prepare("UPDATE objetivos SET concluido_em = ? WHERE id = ?").run(
    concluido ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
    objetivo.id
  );
  if (concluido) {
    criarNotificacao({
      cliente_id: objetivo.cliente_id,
      tipo: "objetivo_concluido",
      titulo: "Objetivo concluído! 🏆",
      mensagem: `Você bateu a meta de "${objetivo.titulo}". Parabéns!`,
      referencia_id: objetivo.id,
    });
  }
}

// ---------- Progresso ----------

/** Calcula o progresso de um objetivo. Pra 'quantidade_ativo', soma a
 *  quantidade em posição do ativo informado (mesma normalização de ticker
 *  usada em consolidarPosicoes, então "BBAS3", "bbas3" etc. batem igual).
 *  Pra 'valor_livre', o "valor atual" é só o progresso_manual que o
 *  consultor for atualizando. Também grava concluido_em na primeira vez que
 *  detecta >= 100%, e desfaz se o progresso cair de novo (ex: cliente vendeu
 *  parte da posição). */
export function calcularProgressoObjetivo(
  objetivo: Objetivo,
  posicoesConsolidadas?: ReturnType<typeof consolidarPosicoes>
): ObjetivoComProgresso {
  let valorAtual: number;
  let meta: number;

  if (objetivo.tipo === "quantidade_ativo") {
    meta = objetivo.meta_quantidade ?? 0;
    const posicoes =
      posicoesConsolidadas ?? consolidarPosicoes(listarPosicoesDoCliente(objetivo.cliente_id));
    const alvo = normalizarAtivoLocal(objetivo.ativo ?? "");
    valorAtual = posicoes
      .filter((p) => normalizarAtivoLocal(p.ativo) === alvo)
      .reduce((soma, p) => soma + p.quantidade, 0);
  } else {
    meta = objetivo.meta_valor ?? 0;
    valorAtual = objetivo.progresso_manual;
  }

  const progressoPercentual = meta > 0 ? Math.min(100, Math.max(0, (valorAtual / meta) * 100)) : 0;
  const concluido = meta > 0 && valorAtual >= meta;
  definirConclusao(objetivo, concluido);

  return {
    ...objetivo,
    concluido_em: concluido ? objetivo.concluido_em ?? new Date().toISOString() : null,
    valorAtual,
    meta,
    progressoPercentual,
    concluido,
  };
}

export function listarObjetivosComProgresso(clienteId: number): ObjetivoComProgresso[] {
  const objetivos = listarObjetivosDoCliente(clienteId);
  if (objetivos.length === 0) return [];
  // Consolida as posições uma vez só e reaproveita pra todos os objetivos
  // do tipo quantidade_ativo, em vez de reconsultar o banco por objetivo.
  const posicoes = consolidarPosicoes(listarPosicoesDoCliente(clienteId));
  return objetivos.map((o) => calcularProgressoObjetivo(o, posicoes));
}

function normalizarAtivoLocal(ativo: string): string {
  return ativo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
