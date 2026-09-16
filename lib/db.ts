import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { bootstrapConsultorInicial } from "./bootstrap";

// Banco SQLite local (arquivo). Em produção, troque por Postgres/MySQL mantendo
// as mesmas funções de acesso a dados abaixo.
//
// O caminho é configurável via DB_PATH pra poder apontar pra um disco
// persistente (ex: volume do Railway montado em /data) — sem isso, hospedar
// num container normal faria o banco ser apagado a cada novo deploy, já que
// só a pasta do volume sobrevive entre deploys.
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), "data.db");

declare global {
  var __db: DatabaseSync | undefined;
}

function getDb(): DatabaseSync {
  if (!global.__db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA foreign_keys = ON;");
    migrate(db);
    bootstrapConsultorInicial(db);
    global.__db = db;
  }
  return global.__db;
}

function migrate(db: DatabaseSync) {
  // Migrações que mexem em restrição (CHECK) de tabela já existente rodam
  // ANTES do schema.sql: "CREATE TABLE IF NOT EXISTS" não altera uma tabela
  // que já existe, então um CHECK novo só pega bancos criados do zero — quem
  // já tem o banco (como o Pedro) precisa dessa migração pontual pra ganhar
  // o valor novo. Depois que a tabela tiver a forma certa, o schema.sql roda
  // normal e recria os índices (CREATE INDEX IF NOT EXISTS já cobre isso).
  migrarTipoNotificacaoDesvio(db);
  migrarColunaArquivadaRecomendacoes(db);
  migrarTipoNotificacaoObjetivo(db);
  migrarColunasIndexadorPosicoes(db);
  migrarColunaTelefoneClientes(db);
  migrarTipoNotificacaoMovimentacao(db);

  const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}

/** Adiciona 'desvio_modelo' ao CHECK de notificacoes.tipo, reconstruindo a
 *  tabela (SQLite não tem ALTER TABLE ... para mudar CHECK) e preservando as
 *  linhas existentes. Idempotente: só mexe se a tabela existir e ainda não
 *  tiver o valor novo no CHECK. */
function migrarTipoNotificacaoDesvio(db: DatabaseSync) {
  const tabela = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notificacoes'`)
    .get() as { sql: string } | undefined;

  if (!tabela) return; // banco novo — schema.sql abaixo já cria com o CHECK certo
  if (tabela.sql.includes("desvio_modelo")) return; // já migrado

  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`ALTER TABLE notificacoes RENAME TO notificacoes_old_migracao`);
    db.exec(`
      CREATE TABLE notificacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK (tipo IN ('recomendacao','variacao_preco','desvio_modelo')),
        titulo TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        referencia_id INTEGER,
        lida INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      INSERT INTO notificacoes (id, cliente_id, tipo, titulo, mensagem, referencia_id, lida, criado_em)
      SELECT id, cliente_id, tipo, titulo, mensagem, referencia_id, lida, criado_em
      FROM notificacoes_old_migracao
    `);
    db.exec(`DROP TABLE notificacoes_old_migracao`);
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

/** Adiciona a coluna `arquivada_em` a `recomendacoes` (usada pelo botão
 *  "Limpar aceitas"). Diferente da migração de CHECK acima, uma coluna nova
 *  sem CHECK/NOT NULL dá pra adicionar direto com ALTER TABLE ADD COLUMN —
 *  não precisa reconstruir a tabela. Idempotente via PRAGMA table_info. */
function migrarColunaArquivadaRecomendacoes(db: DatabaseSync) {
  const tabela = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recomendacoes'`)
    .get();
  if (!tabela) return; // banco novo — schema.sql abaixo já cria com a coluna

  const colunas = db.prepare(`PRAGMA table_info(recomendacoes)`).all() as { name: string }[];
  const jaTemColuna = colunas.some((c) => c.name === "arquivada_em");
  if (jaTemColuna) return;

  db.exec(`ALTER TABLE recomendacoes ADD COLUMN arquivada_em TEXT`);
}

/** Adiciona 'objetivo_concluido' ao CHECK de notificacoes.tipo (aviso pro
 *  cliente quando um objetivo bate 100% da meta), reconstruindo a tabela e
 *  preservando as linhas existentes — mesma técnica de
 *  migrarTipoNotificacaoDesvio acima. Idempotente: só mexe se a tabela
 *  existir e ainda não tiver o valor novo no CHECK. */
function migrarTipoNotificacaoObjetivo(db: DatabaseSync) {
  const tabela = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notificacoes'`)
    .get() as { sql: string } | undefined;

  if (!tabela) return; // banco novo — schema.sql abaixo já cria com o CHECK certo
  if (tabela.sql.includes("objetivo_concluido")) return; // já migrado

  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`ALTER TABLE notificacoes RENAME TO notificacoes_old_migracao2`);
    db.exec(`
      CREATE TABLE notificacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK (tipo IN ('recomendacao','variacao_preco','desvio_modelo','objetivo_concluido')),
        titulo TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        referencia_id INTEGER,
        lida INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      INSERT INTO notificacoes (id, cliente_id, tipo, titulo, mensagem, referencia_id, lida, criado_em)
      SELECT id, cliente_id, tipo, titulo, mensagem, referencia_id, lida, criado_em
      FROM notificacoes_old_migracao2
    `);
    db.exec(`DROP TABLE notificacoes_old_migracao2`);
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

/** Adiciona as colunas `indexador` e `indexador_percentual` a `posicoes`
 *  (usadas pra atualização automática de Renda Fixa indexada ao CDI, ver
 *  lib/rendaFixaIndexada.ts) — mesma técnica de
 *  migrarColunaArquivadaRecomendacoes: sem CHECK/NOT NULL, dá pra usar
 *  ALTER TABLE ADD COLUMN direto. Idempotente via PRAGMA table_info. */
function migrarColunasIndexadorPosicoes(db: DatabaseSync) {
  const tabela = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'posicoes'`)
    .get();
  if (!tabela) return; // banco novo — schema.sql abaixo já cria com as colunas

  const colunas = db.prepare(`PRAGMA table_info(posicoes)`).all() as { name: string }[];
  if (!colunas.some((c) => c.name === "indexador")) {
    db.exec(`ALTER TABLE posicoes ADD COLUMN indexador TEXT`);
  }
  if (!colunas.some((c) => c.name === "indexador_percentual")) {
    db.exec(`ALTER TABLE posicoes ADD COLUMN indexador_percentual REAL`);
  }
}

/** Adiciona a coluna `telefone` a `clientes` (usada pela aba "Dados do
 *  cliente" que o consultor edita — ver components/EditarClienteForm.tsx) —
 *  mesma técnica de migrarColunaArquivadaRecomendacoes: sem CHECK/NOT NULL,
 *  dá pra usar ALTER TABLE ADD COLUMN direto. Idempotente via PRAGMA
 *  table_info. */
function migrarColunaTelefoneClientes(db: DatabaseSync) {
  const tabela = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'clientes'`)
    .get();
  if (!tabela) return; // banco novo — schema.sql abaixo já cria com a coluna

  const colunas = db.prepare(`PRAGMA table_info(clientes)`).all() as { name: string }[];
  if (!colunas.some((c) => c.name === "telefone")) {
    db.exec(`ALTER TABLE clientes ADD COLUMN telefone TEXT`);
  }
}

/** Adiciona 'movimentacao' ao CHECK de notificacoes.tipo (aviso pro cliente
 *  quando o consultor aprova ou recusa um aporte/retirada informado — ver
 *  lib/repo/movimentacoes.ts), reconstruindo a tabela e preservando as
 *  linhas existentes — mesma técnica de migrarTipoNotificacaoDesvio acima.
 *  Idempotente: só mexe se a tabela existir e ainda não tiver o valor novo
 *  no CHECK. */
function migrarTipoNotificacaoMovimentacao(db: DatabaseSync) {
  const tabela = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notificacoes'`)
    .get() as { sql: string } | undefined;

  if (!tabela) return; // banco novo — schema.sql abaixo já cria com o CHECK certo
  if (tabela.sql.includes("movimentacao")) return; // já migrado

  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`ALTER TABLE notificacoes RENAME TO notificacoes_old_migracao3`);
    db.exec(`
      CREATE TABLE notificacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK (tipo IN ('recomendacao','variacao_preco','desvio_modelo','objetivo_concluido','movimentacao')),
        titulo TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        referencia_id INTEGER,
        lida INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      INSERT INTO notificacoes (id, cliente_id, tipo, titulo, mensagem, referencia_id, lida, criado_em)
      SELECT id, cliente_id, tipo, titulo, mensagem, referencia_id, lida, criado_em
      FROM notificacoes_old_migracao3
    `);
    db.exec(`DROP TABLE notificacoes_old_migracao3`);
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

export default getDb;

// node:sqlite retorna linhas com um protótipo especial, que o React não
// consegue serializar ao passar de Server para Client Components. Estas
// funções normalizam o resultado para objetos/arrays "planos".
export function plainRow<T>(row: T): T {
  return row == null ? row : ({ ...(row as Record<string, unknown>) } as T);
}

export function plainRows<T>(rows: T[]): T[] {
  return rows.map((r) => plainRow(r));
}
