import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "session";
const secretString =
  process.env.AUTH_SECRET ||
  "dev-only-secret-troque-em-producao-0123456789";
const secret = new TextEncoder().encode(secretString);

export interface SessionPayload {
  userId: number;
  papel: "consultor" | "cliente";
  nome: string;
  clienteId?: number;
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function criarSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verificarSessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function definirCookieSessao(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function limparCookieSessao() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessao(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarSessionToken(token);
}

// Igual a getSessao(), mas também aceita "Authorization: Bearer <token>".
// Usado pelas rotas de API para que o app Android (que não guarda cookies
// httpOnly) consiga se autenticar mandando o token no header, enquanto o
// app web continua funcionando normalmente via cookie de sessão.
export async function getSessaoFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    const sessao = await verificarSessionToken(token);
    if (sessao) return sessao;
  }
  return getSessao();
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
