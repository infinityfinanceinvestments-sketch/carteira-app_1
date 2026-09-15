import type { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

/** Em produção, na primeira vez que o servidor sobe com um banco vazio (ex:
 *  volume novo no Railway), cria a conta do consultor a partir das
 *  variáveis de ambiente CONSULTOR_EMAIL / CONSULTOR_SENHA / CONSULTOR_NOME
 *  — assim dá pra fazer o primeiro login sem precisar rodar nenhum comando
 *  manual no servidor. Não faz nada se já existir algum consultor
 *  cadastrado (idempotente — seguro rodar a cada deploy) ou se as
 *  variáveis não estiverem definidas (ambiente local de desenvolvimento,
 *  por exemplo, onde a conta de demonstração já vem do `npm run db:seed`). */
export function bootstrapConsultorInicial(db: DatabaseSync): void {
  const email = process.env.CONSULTOR_EMAIL;
  const senha = process.env.CONSULTOR_SENHA;
  const nome = process.env.CONSULTOR_NOME;
  if (!email || !senha || !nome) return;

  const existente = db
    .prepare("SELECT id FROM usuarios WHERE papel = 'consultor' LIMIT 1")
    .get();
  if (existente) return;

  const senhaHash = bcrypt.hashSync(senha, 10);
  db.prepare(
    "INSERT INTO usuarios (email, senha_hash, papel, nome) VALUES (?, ?, 'consultor', ?)"
  ).run(email, senhaHash, nome);
  console.log(`[bootstrap] Conta de consultor criada automaticamente para ${email}.`);
}
