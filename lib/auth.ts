import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "session";

function resolverAuthSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    // Em produção (next start / deploy) é obrigatório definir uma chave
    // real — recusar iniciar aqui é melhor do que assinar sessões de login
    // com um valor padrão previsível. Veja .env.example.
    throw new Error(
      "AUTH_SECRET não está definida. Defina uma chave forte e aleatória nessa variável de ambiente antes de rodar em produção (veja .env.example)."
    );
  }
  // Só em desenvolvimento local (npm run dev): evita exigir configuração
  // pra simplesmente testar o app.
  return "dev-only-secret-troque-em-producao-0123456789";
}

const secret = new TextEncoder().encode(resolverAuthSecret());

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

// --- Verificação em duas etapas (2FA) por e-mail no primeiro acesso ---
// Só usado pelo login web (a checagem de habilitar ou não fica na própria
// rota de login) — ver lib/repo/dois-fatores.ts pros códigos/dispositivos.

const DEVICE_COOKIE_NAME = "device_trust";

export interface Pending2faPayload {
  tipo: "2fa_pendente";
  userId: number;
}

/** Token de curta duração (10 min) que representa "senha já conferida,
 *  falta o código do e-mail" — evita que a etapa de verificar código aceite
 *  um usuarioId arbitrário mandado pelo cliente. */
export async function criarPending2faToken(userId: number): Promise<string> {
  return new SignJWT({ tipo: "2fa_pendente", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verificarPending2faToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.tipo !== "2fa_pendente" || typeof payload.userId !== "number") return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export async function definirCookieDispositivoConfiavel(token: string, maxAgeSegundos: number) {
  const store = await cookies();
  store.set(DEVICE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSegundos,
  });
}

export async function getCookieDispositivoConfiavel(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE_NAME)?.value;
}

export function getCookieDispositivoConfiavelFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get(DEVICE_COOKIE_NAME)?.value;
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
