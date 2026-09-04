// Script de configuração única: cria o usuário do Pedro como cliente e
// importa a posição real dele a partir do extrato baixado do Portal do
// Investidor da B3. Usa a própria API do app rodando localmente — exercita
// exatamente o mesmo caminho que o painel web usa, então também serve como
// teste de ponta a ponta da importação de extrato B3.
//
// Uso: node scripts/importar-pedro.mjs
// Pré-requisito: o servidor precisa estar rodando (npm run dev) nessa mesma
// pasta, escutando em http://localhost:3000.

import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.CARTEIRA_APP_URL ?? "http://localhost:3000";
const CAMINHO_EXTRATO =
  "C:\\Users\\pedro\\Desktop\\INFINITY\\app consultoria\\posicoes clientes\\pedro.xlsx";

const NOVO_CLIENTE = {
  nome: "Pedro Dallagnol",
  email: "pedrodallagnol21@gmail.com",
  senha: "pedro123",
  perfil_risco: "moderado",
  benchmark: "CDI",
  instituicao: "Portal do Investidor (B3)",
};

async function chamarApi(caminho, opcoes = {}) {
  const res = await fetch(`${BASE_URL}${caminho}`, opcoes);
  const texto = await res.text();
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    dados = { bruto: texto };
  }
  if (!res.ok) {
    throw new Error(`${caminho} → HTTP ${res.status}: ${JSON.stringify(dados)}`);
  }
  return dados;
}

async function main() {
  if (!fs.existsSync(CAMINHO_EXTRATO)) {
    console.error(`Não achei o arquivo em: ${CAMINHO_EXTRATO}`);
    process.exit(1);
  }

  console.log("1) Entrando como consultor...");
  const login = await chamarApi("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "consultor@carteira.app", senha: "consultor123" }),
  });
  const token = login.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log("   ok, logado como", login.nome);

  console.log("2) Criando o cliente Pedro Dallagnol...");
  let clienteId;
  try {
    const criado = await chamarApi("/api/clientes", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(NOVO_CLIENTE),
    });
    clienteId = criado.clienteId;
    console.log(`   ok, cliente criado (id ${clienteId}).`);
  } catch (erro) {
    if (String(erro.message).includes("Já existe um usuário")) {
      console.log("   já existe um usuário com esse e-mail — buscando o cliente existente...");
      const { clientes } = await chamarApi("/api/clientes", { headers: authHeaders });
      const existente = clientes.find((c) => c.email === NOVO_CLIENTE.email.toLowerCase());
      if (!existente) throw new Error("Usuário existe mas não achei o cliente correspondente.");
      clienteId = existente.id;
      console.log(`   usando cliente existente (id ${clienteId}).`);
    } else {
      throw erro;
    }
  }

  console.log("3) Importando o extrato da B3...");
  const buffer = fs.readFileSync(CAMINHO_EXTRATO);
  const formData = new FormData();
  formData.set(
    "arquivo",
    new File([buffer], path.basename(CAMINHO_EXTRATO), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
  const importacao = await chamarApi(`/api/clientes/${clienteId}/posicoes/importar-b3`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });
  console.log(`   ok, ${importacao.importadas} posições importadas.`);
  if (importacao.avisos?.length) {
    console.log("   avisos:");
    for (const a of importacao.avisos) console.log("   -", a);
  }

  console.log("4) Conferindo o total da carteira...");
  const detalhe = await chamarApi(`/api/clientes/${clienteId}`, { headers: authHeaders });
  console.log(`   valor total: R$ ${detalhe.valorTotal.toFixed(2)}`);

  console.log("\nPronto! Login do Pedro no app/painel:");
  console.log(`  e-mail: ${NOVO_CLIENTE.email}`);
  console.log(`  senha:  ${NOVO_CLIENTE.senha}`);
}

main().catch((erro) => {
  console.error("\nErro:", erro.message);
  process.exit(1);
});
