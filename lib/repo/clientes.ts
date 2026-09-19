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
  telefone?: string | null;
  perfil_risco: string;
  objetivo: string | null;
  carteira_modelo_id: number | null;
  benchmark: string;
}): number {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO clientes (usuario_id, consultor_id, nome, email, telefone, perfil_risco, objetivo, carteira_modelo_id, benchmark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.usuario_id,
      input.consultor_id,
      input.nome,
      input.email,
      input.telefone ?? null,
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

/** Atualiza os dados cadastrais do cliente (aba "Dados do cliente" — ver
 *  components/EditarClienteForm.tsx e app/api/clientes/[id]/dados/route.ts).
 *  Só mexe em `clientes` — nome/email do LOGIN (`usuarios`) é atualizado à
 *  parte por atualizarNomeEmailUsuario, já que são tabelas/colunas
 *  diferentes (ver comentário na rota). */
/** Atualiza só e-mail/telefone de CONTATO (clientes.email) — usada pela
 *  tela "Meu perfil" do próprio cliente (ver app/api/clientes/[id]/perfil).
 *  Diferente de atualizarDadosCliente (usada pelo consultor, que também
 *  mexe em nome/perfil de risco/objetivo) e de atualizarNomeEmailUsuario
 *  (o e-mail de LOGIN, em usuarios) — o cliente nunca troca o próprio
 *  e-mail de login por aqui, só o de contato. */
export function atualizarContatoCliente(
  clienteId: number,
  input: { email: string; telefone: string | null }
): void {
  const db = getDb();
  db.prepare(`UPDATE clientes SET email = ?, telefone = ? WHERE id = ?`).run(
    input.email,
    input.telefone,
    clienteId
  );
}

/** Define o valor do fee mensal e o dia de vencimento (aba "Pagamento" do
 *  perfil — ver components/PagamentoFeeSection.tsx). `valorFee` null = "a
 *  definir" (o consultor ainda não combinou o valor com o cliente). */
export function atualizarConfiguracaoFee(
  clienteId: number,
  input: { valor_fee: number | null; dia_vencimento_fee: number | null }
): void {
  const db = getDb();
  db.prepare(`UPDATE clientes SET valor_fee = ?, dia_vencimento_fee = ? WHERE id = ?`).run(
    input.valor_fee,
    input.dia_vencimento_fee,
    clienteId
  );
}

export function atualizarDadosCliente(
  clienteId: number,
  input: {
    nome: string;
    email: string;
    telefone: string | null;
    perfil_risco: string;
    objetivo: string | null;
  }
): void {
  const db = getDb();
  db.prepare(
    `UPDATE clientes SET nome = ?, email = ?, telefone = ?, perfil_risco = ?, objetivo = ? WHERE id = ?`
  ).run(
    input.nome,
    input.email,
    input.telefone,
    input.perfil_risco,
    input.objetivo,
    clienteId
  );
}
