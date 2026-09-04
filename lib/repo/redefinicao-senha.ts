import { randomBytes } from "node:crypto";
import getDb, { plainRow } from "../db";
import type { TokenRedefinicaoSenha } from "../types";

const VALIDADE_TOKEN_REDEFINICAO_MS = 60 * 60 * 1000; // 1h

/** Gera um token de uso único pra redefinir a senha de um usuário. Não
 *  envia e-mail (o app não tem servidor de e-mail configurado) — o link
 *  é gerado pra o consultor copiar e mandar pro cliente por fora (whatsapp,
 *  e-mail pessoal etc). */
export function criarTokenRedefinicao(usuarioId: number): TokenRedefinicaoSenha {
  const db = getDb();
  const token = randomBytes(24).toString("base64url");
  const expiraEm = new Date(Date.now() + VALIDADE_TOKEN_REDEFINICAO_MS).toISOString();
  db.prepare(
    "INSERT INTO tokens_redefinicao_senha (usuario_id, token, expira_em) VALUES (?, ?, ?)"
  ).run(usuarioId, token, expiraEm);
  return plainRow(
    db
      .prepare("SELECT * FROM tokens_redefinicao_senha WHERE token = ?")
      .get(token) as unknown as TokenRedefinicaoSenha
  );
}

/** Devolve o token só se ainda for válido (não usado e dentro da validade). */
export function getTokenRedefinicaoValido(
  token: string
): TokenRedefinicaoSenha | undefined {
  const db = getDb();
  const registro = plainRow(
    db
      .prepare("SELECT * FROM tokens_redefinicao_senha WHERE token = ?")
      .get(token) as TokenRedefinicaoSenha | undefined
  );
  if (!registro) return undefined;
  if (registro.usado) return undefined;
  if (registro.expira_em < new Date().toISOString()) return undefined;
  return registro;
}

export function marcarTokenRedefinicaoUsado(id: number): void {
  const db = getDb();
  db.prepare("UPDATE tokens_redefinicao_senha SET usado = 1 WHERE id = ?").run(id);
}
