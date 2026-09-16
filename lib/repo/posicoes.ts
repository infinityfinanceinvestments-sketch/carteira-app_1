import getDb, { plainRow, plainRows } from "../db";
import type { Conta, Posicao } from "../types";
import { calcularAporteEmPosicao, calcularRetiradaEmPosicao } from "../movimentacoes";

// ---------- Contas ----------

export function getOuCriarContaManual(clienteId: number, instituicao: string): number {
  const db = getDb();
  const existente = db
    .prepare(
      "SELECT id FROM contas WHERE cliente_id = ? AND instituicao = ? LIMIT 1"
    )
    .get(clienteId, instituicao) as { id: number } | undefined;
  if (existente) return existente.id;
  const info = db
    .prepare(
      "INSERT INTO contas (cliente_id, instituicao, origem) VALUES (?, ?, 'manual')"
    )
    .run(clienteId, instituicao);
  return Number(info.lastInsertRowid);
}

export function listarContasDoCliente(clienteId: number): Conta[] {
  const db = getDb();
  return plainRows(
    db.prepare("SELECT * FROM contas WHERE cliente_id = ?").all(clienteId) as unknown as Conta[]
  );
}

// ---------- Posições ----------

export function listarPosicoesDoCliente(clienteId: number): Posicao[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        `SELECT p.* FROM posicoes p
         JOIN contas c ON c.id = p.conta_id
         WHERE c.cliente_id = ?
         ORDER BY p.classe, p.ativo`
      )
      .all(clienteId) as unknown as Posicao[]
  );
}

export function listarPosicoesDaConta(contaId: number): Posicao[] {
  const db = getDb();
  return plainRows(
    db.prepare("SELECT * FROM posicoes WHERE conta_id = ?").all(contaId) as unknown as Posicao[]
  );
}

export function getPosicaoPorId(id: number): Posicao | undefined {
  const db = getDb();
  return plainRow(
    db.prepare("SELECT * FROM posicoes WHERE id = ?").get(id) as Posicao | undefined
  );
}

/** Mesma coisa que `getPosicaoPorId`, mas já traz o `cliente_id` dono da
 *  posição (via join com `contas`) — usado pra validar que um
 *  `posicao_id` informado numa movimentação (ver lib/repo/movimentacoes.ts)
 *  realmente pertence ao cliente que está pedindo, e não a outro. */
export function getPosicaoComCliente(
  id: number
): (Posicao & { cliente_id: number }) | undefined {
  const db = getDb();
  return plainRow(
    db
      .prepare(
        `SELECT p.*, c.cliente_id as cliente_id
         FROM posicoes p JOIN contas c ON c.id = p.conta_id
         WHERE p.id = ?`
      )
      .get(id) as (Posicao & { cliente_id: number }) | undefined
  );
}

function normalizarAtivo(ativo: string): string {
  return ativo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Agrupa numa única linha as posições do mesmo ativo (mesmo ticker,
 *  mesma classe) que estejam espalhadas em contas/instituições diferentes
 *  — por exemplo, ações que aparecem tanto na carteira normal quanto no
 *  extrato de aluguel/empréstimo da B3, ou o mesmo papel importado de
 *  corretoras distintas. Soma quantidade e valor de mercado e recalcula o
 *  preço médio ponderado pelas quantidades de cada lote, pra exibir uma
 *  posição consolidada só, em vez de linhas duplicadas do mesmo ativo.
 *  Só afeta a exibição — os lotes originais continuam guardados como
 *  vieram, por conta/instituição. */
export function consolidarPosicoes(posicoes: Posicao[]): Posicao[] {
  const grupos = new Map<
    string,
    Posicao & { custoTotal: number }
  >();
  for (const p of posicoes) {
    const chave = `${normalizarAtivo(p.ativo)}::${p.classe}`;
    const custo = p.preco_medio * p.quantidade;
    const existente = grupos.get(chave);
    if (!existente) {
      grupos.set(chave, { ...p, custoTotal: custo });
    } else {
      existente.quantidade += p.quantidade;
      existente.valor_atual += p.valor_atual;
      existente.custoTotal += custo;
      if (p.atualizado_em > existente.atualizado_em) {
        existente.atualizado_em = p.atualizado_em;
      }
    }
  }
  return Array.from(grupos.values()).map((g) => ({
    id: g.id,
    conta_id: g.conta_id,
    ativo: g.ativo,
    classe: g.classe,
    quantidade: g.quantidade,
    preco_medio: g.quantidade !== 0 ? g.custoTotal / g.quantidade : 0,
    valor_atual: g.valor_atual,
    atualizado_em: g.atualizado_em,
    // Só faz sentido um valor por ativo consolidado — usa o do primeiro
    // lote do grupo (o caso comum é um lote só por ativo de Renda Fixa).
    indexador: g.indexador,
    indexador_percentual: g.indexador_percentual,
  }));
}

export function inserirPosicao(input: {
  conta_id: number;
  ativo: string;
  classe: string;
  quantidade: number;
  preco_medio: number;
  valor_atual: number;
}): number {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO posicoes (conta_id, ativo, classe, quantidade, preco_medio, valor_atual)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.conta_id,
      input.ativo,
      input.classe,
      input.quantidade,
      input.preco_medio,
      input.valor_atual
    );
  return Number(info.lastInsertRowid);
}

/** Remove todas as posições de uma conta — usado antes de reimportar um
 *  extrato (B3 ou CSV), pra reimportação não duplicar as posições que já
 *  tinham sido importadas da vez anterior. */
export function removerPosicoesDaConta(contaId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM posicoes WHERE conta_id = ?").run(contaId);
}

/** Atualiza só o valor de mercado de uma posição (ex: cotação atual da B3,
 *  ou o rendimento acumulado do CDI — ver lib/rendaFixaIndexada.ts), sem
 *  mexer em quantidade/preço médio — usado pra refletir o preço/valor real
 *  do ativo em vez do valor lançado manualmente. Também avança
 *  `atualizado_em` pra hoje, que é a "data base" usada pra calcular o
 *  próximo incremento de rendimento indexado — por isso nunca aplica o
 *  mesmo dia duas vezes. */
export function atualizarValorAtualPosicao(id: number, valorAtual: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE posicoes SET valor_atual = ?, atualizado_em = datetime('now') WHERE id = ?`
  ).run(valorAtual, id);
}

/** Marca (ou desmarca, passando `indexador: null`) uma posição de Renda
 *  Fixa como indexada a um indicador de mercado (hoje só "CDI" é suportado)
 *  com um percentual do indicador (ex: 100 pra "100% do CDI") — é isso que
 *  liga a atualização automática de valor em lib/rendaFixaIndexada.ts. Não
 *  mexe em `atualizado_em`: a data-base do próximo cálculo continua sendo a
 *  última vez que o valor foi de fato atualizado (importação, lançamento
 *  manual, ou um incremento anterior do CDI). */
/** Aplica um aporte (informado pelo cliente e aprovado pelo consultor — ver
 *  lib/repo/movimentacoes.ts) a uma posição existente. A conta feita é a
 *  mesma de `calcularAporteEmPosicao` (lib/movimentacoes.ts); esta função só
 *  lê o estado atual do banco e grava o resultado. */
export function aplicarAporteEmPosicao(
  id: number,
  valor: number,
  quantidadeAdicional: number | null
): void {
  const db = getDb();
  const posicao = getPosicaoPorId(id);
  if (!posicao) throw new Error("Posição não encontrada.");
  const novo = calcularAporteEmPosicao(posicao, valor, quantidadeAdicional);
  db.prepare(
    `UPDATE posicoes SET quantidade = ?, preco_medio = ?, valor_atual = ?, atualizado_em = datetime('now') WHERE id = ?`
  ).run(novo.quantidade, novo.preco_medio, novo.valor_atual, id);
}

/** Aplica uma retirada (informada pelo cliente e aprovada pelo consultor —
 *  ver lib/repo/movimentacoes.ts) a uma posição existente. Quando a
 *  retirada zera a posição (por valor ou por quantidade — ver
 *  `calcularRetiradaEmPosicao`), a linha é apagada em vez de deixar uma
 *  posição zerada na carteira. Devolve se a posição foi removida. */
export function aplicarRetiradaEmPosicao(
  id: number,
  valor: number,
  quantidadeRetirada: number | null
): { removida: boolean } {
  const db = getDb();
  const posicao = getPosicaoPorId(id);
  if (!posicao) throw new Error("Posição não encontrada.");
  const novo = calcularRetiradaEmPosicao(posicao, valor, quantidadeRetirada);
  if (novo.removida) {
    db.prepare("DELETE FROM posicoes WHERE id = ?").run(id);
  } else {
    db.prepare(
      `UPDATE posicoes SET quantidade = ?, preco_medio = ?, valor_atual = ?, atualizado_em = datetime('now') WHERE id = ?`
    ).run(novo.quantidade, novo.preco_medio, novo.valor_atual, id);
  }
  return { removida: novo.removida };
}

export function atualizarIndexadorPosicao(
  id: number,
  indexador: string | null,
  indexadorPercentual: number | null
): void {
  const db = getDb();
  db.prepare(
    `UPDATE posicoes SET indexador = ?, indexador_percentual = ? WHERE id = ?`
  ).run(indexador, indexadorPercentual, id);
}
