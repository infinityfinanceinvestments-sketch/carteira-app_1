// Popula o banco (data.db) com dados de demonstração: 1 consultor, 3 clientes
// com perfis diferentes, carteiras-modelo, posições, histórico de evolução
// patrimonial e recomendações em status variados.
//
// Uso: npm run db:seed  (ou node scripts/seed.mjs)

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "schema.sql");

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log("Banco anterior removido, recriando do zero.");
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));

function run(sql, ...params) {
  return db.prepare(sql).run(...params);
}

function hashSync(senha) {
  return bcrypt.hashSync(senha, 10);
}

// ---------- Consultor ----------

const consultorId = Number(
  run(
    "INSERT INTO usuarios (email, senha_hash, papel, nome) VALUES (?, ?, 'consultor', ?)",
    "consultor@carteira.app",
    hashSync("consultor123"),
    "Você (Consultor)"
  ).lastInsertRowid
);

// ---------- Carteiras-modelo ----------

function criarCarteiraModelo(nome, descricao, alocacoes) {
  const id = Number(
    run(
      "INSERT INTO carteiras_modelo (nome, descricao) VALUES (?, ?)",
      nome,
      descricao
    ).lastInsertRowid
  );
  for (const [classe, percentual] of Object.entries(alocacoes)) {
    run(
      "INSERT INTO alocacoes_alvo (carteira_modelo_id, classe, percentual_alvo) VALUES (?, ?, ?)",
      id,
      classe,
      percentual
    );
  }
  return id;
}

const modeloConservador = criarCarteiraModelo(
  "Perfil Conservador",
  "Foco em preservação de capital e baixa volatilidade.",
  { "Renda Fixa": 70, Fundos: 15, FIIs: 10, "Ações": 5 }
);

const modeloModerado = criarCarteiraModelo(
  "Perfil Moderado 2026",
  "Equilíbrio entre renda fixa e ativos de maior risco.",
  { "Renda Fixa": 40, "Ações": 20, Fundos: 15, FIIs: 15, ETFs: 10 }
);

const modeloArrojado = criarCarteiraModelo(
  "Perfil Arrojado",
  "Maior exposição a renda variável e ativos internacionais.",
  {
    "Renda Fixa": 15,
    "Ações": 35,
    FIIs: 10,
    ETFs: 20,
    Cripto: 10,
    "Moeda Estrangeira": 10,
  }
);

// ---------- Clientes ----------

function criarCliente({
  nome,
  email,
  senha,
  perfil_risco,
  objetivo,
  carteira_modelo_id,
  benchmark,
  instituicao,
}) {
  const usuarioId = Number(
    run(
      "INSERT INTO usuarios (email, senha_hash, papel, nome) VALUES (?, ?, 'cliente', ?)",
      email,
      hashSync(senha),
      nome
    ).lastInsertRowid
  );
  const clienteId = Number(
    run(
      `INSERT INTO clientes (usuario_id, consultor_id, nome, email, perfil_risco, objetivo, carteira_modelo_id, benchmark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      usuarioId,
      consultorId,
      nome,
      email,
      perfil_risco,
      objetivo,
      carteira_modelo_id,
      benchmark
    ).lastInsertRowid
  );
  const contaId = Number(
    run(
      "INSERT INTO contas (cliente_id, instituicao, origem) VALUES (?, ?, 'importacao')",
      clienteId,
      instituicao
    ).lastInsertRowid
  );
  return { clienteId, contaId };
}

function inserirPosicao(contaId, ativo, classe, quantidade, precoMedio, valorAtual) {
  run(
    `INSERT INTO posicoes (conta_id, ativo, classe, quantidade, preco_medio, valor_atual)
     VALUES (?, ?, ?, ?, ?, ?)`,
    contaId,
    ativo,
    classe,
    quantidade,
    precoMedio,
    valorAtual
  );
}

function gerarHistorico(clienteId, valorFinal, meses, volatilidade) {
  const hoje = new Date();
  for (let i = meses; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const progresso = (meses - i) / meses;
    // curva suave até o valor final, com uma leve ondulação determinística
    const ondulacao = Math.sin(i * 0.9) * volatilidade;
    const valorTotal = Math.max(
      0,
      valorFinal * (0.72 + 0.28 * progresso) + ondulacao
    );
    const valorBenchmark = Math.max(
      0,
      valorFinal * (0.75 + 0.22 * progresso)
    );
    run(
      `INSERT INTO historico_patrimonio (cliente_id, data, valor_total, valor_benchmark)
       VALUES (?, ?, ?, ?)`,
      clienteId,
      data.toISOString().slice(0, 10),
      Math.round(valorTotal * 100) / 100,
      Math.round(valorBenchmark * 100) / 100
    );
  }
}

function criarRecomendacao(clienteId, ativo, classe, tipo, justificativa, status, diasAtras) {
  const criadoEm = new Date(Date.now() - diasAtras * 86400000).toISOString();
  const historico = JSON.stringify([{ status, data: criadoEm }]);
  run(
    `INSERT INTO recomendacoes (cliente_id, ativo, classe, tipo_operacao, justificativa, status, historico_status, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    clienteId,
    ativo,
    classe,
    tipo,
    justificativa,
    status,
    historico,
    criadoEm,
    criadoEm
  );
}

// --- Ana Beatriz (moderado) ---
const ana = criarCliente({
  nome: "Ana Beatriz Souza",
  email: "ana@carteira.app",
  senha: "cliente123",
  perfil_risco: "moderado",
  objetivo: "Aposentadoria confortável em cerca de 20 anos.",
  carteira_modelo_id: modeloModerado,
  benchmark: "CDI",
  instituicao: "XP Investimentos",
});
inserirPosicao(ana.contaId, "TESOURO SELIC 2029", "Renda Fixa", 12, 1080, 12960);
inserirPosicao(ana.contaId, "CDB LIQUIDEZ DIÁRIA", "Renda Fixa", 1, 45000, 47250);
inserirPosicao(ana.contaId, "PETR4", "Ações", 300, 27.8, 32100);
inserirPosicao(ana.contaId, "VALE3", "Ações", 150, 61.0, 9750);
inserirPosicao(ana.contaId, "FUNDO MULTIMERCADO XP", "Fundos", 500, 105.0, 54500);
inserirPosicao(ana.contaId, "HGLG11", "FIIs", 120, 158.0, 20880);
inserirPosicao(ana.contaId, "IVVB11", "ETFs", 60, 280.0, 18200);
gerarHistorico(ana.clienteId, 195640, 12, 3500);
criarRecomendacao(
  ana.clienteId,
  "IVVB11",
  "ETFs",
  "compra",
  "Aumentar exposição internacional para reduzir concentração em Renda Fixa, dentro do desvio identificado na carteira-modelo.",
  "enviada",
  2
);
criarRecomendacao(
  ana.clienteId,
  "CDB LIQUIDEZ DIÁRIA",
  "Renda Fixa",
  "manutencao",
  "Manter como reserva de liquidez para oportunidades e emergências.",
  "aceita",
  20
);
criarRecomendacao(
  ana.clienteId,
  "VALE3",
  "Ações",
  "venda",
  "Realizar parte do lucro após forte valorização recente e reduzir concentração em uma única ação.",
  "executada",
  45
);

// --- Carlos Eduardo (conservador) ---
const carlos = criarCliente({
  nome: "Carlos Eduardo Lima",
  email: "carlos@carteira.app",
  senha: "cliente123",
  perfil_risco: "conservador",
  objetivo: "Reserva de emergência e preservação de capital.",
  carteira_modelo_id: modeloConservador,
  benchmark: "CDI",
  instituicao: "Itaú",
});
inserirPosicao(carlos.contaId, "TESOURO SELIC 2027", "Renda Fixa", 25, 1050, 27500);
inserirPosicao(carlos.contaId, "CDB 110% CDI", "Renda Fixa", 1, 60000, 63200);
inserirPosicao(carlos.contaId, "FUNDO DI ITAÚ", "Fundos", 400, 45.0, 18800);
inserirPosicao(carlos.contaId, "HGRU11", "FIIs", 40, 130.0, 5240);
inserirPosicao(carlos.contaId, "BBAS3", "Ações", 100, 27.0, 2850);
gerarHistorico(carlos.clienteId, 117590, 12, 900);
criarRecomendacao(
  carlos.clienteId,
  "TESOURO SELIC 2027",
  "Renda Fixa",
  "compra",
  "Direcionar novos aportes para título pós-fixado, mantendo a liquidez compatível com o perfil conservador.",
  "enviada",
  5
);

// --- Fernanda Rocha (arrojado) ---
const fernanda = criarCliente({
  nome: "Fernanda Rocha",
  email: "fernanda@carteira.app",
  senha: "cliente123",
  perfil_risco: "arrojado",
  objetivo: "Crescimento de patrimônio no longo prazo, com maior tolerância a oscilações.",
  carteira_modelo_id: modeloArrojado,
  benchmark: "IBOVESPA",
  instituicao: "BTG Pactual",
});
inserirPosicao(fernanda.contaId, "TESOURO IPCA+ 2035", "Renda Fixa", 8, 1200, 10500);
inserirPosicao(fernanda.contaId, "PETR4", "Ações", 500, 27.0, 53500);
inserirPosicao(fernanda.contaId, "MGLU3", "Ações", 2000, 3.2, 7600);
inserirPosicao(fernanda.contaId, "XPLG11", "FIIs", 80, 100.0, 8560);
inserirPosicao(fernanda.contaId, "IVVB11", "ETFs", 150, 280.0, 45500);
inserirPosicao(fernanda.contaId, "BITCOIN (custódia BTG)", "Cripto", 0.15, 320000, 51000);
inserirPosicao(fernanda.contaId, "USD (conta global)", "Moeda Estrangeira", 3000, 5.1, 16200);
gerarHistorico(fernanda.clienteId, 192860, 12, 8200);
criarRecomendacao(
  fernanda.clienteId,
  "MGLU3",
  "Ações",
  "venda",
  "Reduzir posição especulativa após forte oscilação recente, redistribuindo para ETFs internacionais.",
  "recusada",
  10
);
criarRecomendacao(
  fernanda.clienteId,
  "IVVB11",
  "ETFs",
  "compra",
  "Reforçar exposição internacional, alinhado à carteira-modelo Arrojado.",
  "enviada",
  1
);

console.log("Seed concluído.");
console.log("");
console.log("Login do consultor: consultor@carteira.app / consultor123");
console.log("Login dos clientes:");
console.log("  ana@carteira.app / cliente123 (moderado)");
console.log("  carlos@carteira.app / cliente123 (conservador)");
console.log("  fernanda@carteira.app / cliente123 (arrojado)");

db.close();
