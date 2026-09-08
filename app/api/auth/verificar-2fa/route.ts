import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioPorId, getClientePorUsuarioId } from "@/lib/repo";
import { verificarCodigoVerificacao, criarDispositivoConfiavel, VALIDADE_COOKIE_DISPOSITIVO_SEGUNDOS } from "@/lib/repo";
import {
  verificarPending2faToken,
  criarSessionToken,
  definirCookieSessao,
  definirCookieDispositivoConfiavel,
} from "@/lib/auth";
import { identificarOrigem, registrarFalha, verificarLimite } from "@/lib/rate-limit";

const schema = z.object({
  pendingToken: z.string().min(1),
  codigo: z.string().min(4).max(10),
});

const JANELA_LIMITE_MS = 10 * 60 * 1000; // 10 minutos
const MAX_TENTATIVAS = 10;

const MENSAGEM_POR_MOTIVO: Record<string, string> = {
  invalido: "Código incorreto.",
  expirado: "Esse código expirou — gere um novo fazendo login de novo.",
  excedeu_tentativas: "Muitas tentativas erradas — gere um novo código fazendo login de novo.",
};

// POST /api/auth/verificar-2fa — segunda etapa do login web quando o
// dispositivo/navegador ainda não é confiável (ver /api/auth/login).
export async function POST(req: NextRequest) {
  const origem = identificarOrigem(req);
  const chaveLimite = `2fa:${origem}`;
  const limite = verificarLimite(chaveLimite, MAX_TENTATIVAS, JANELA_LIMITE_MS);
  if (!limite.permitido) {
    return NextResponse.json(
      {
        erro: `Muitas tentativas. Tente novamente em ${Math.ceil(
          limite.retryApósSegundos / 60
        )} min.`,
      },
      { status: 429, headers: { "Retry-After": String(limite.retryApósSegundos) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const userId = await verificarPending2faToken(parsed.data.pendingToken);
  if (!userId) {
    return NextResponse.json(
      { erro: "Sessão de verificação expirada — faça login de novo." },
      { status: 401 }
    );
  }

  const resultado = verificarCodigoVerificacao(userId, parsed.data.codigo);
  if (!resultado.ok) {
    registrarFalha(chaveLimite, JANELA_LIMITE_MS);
    return NextResponse.json(
      { erro: MENSAGEM_POR_MOTIVO[resultado.motivo] ?? "Código incorreto." },
      { status: 401 }
    );
  }

  const usuario = getUsuarioPorId(userId);
  if (!usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  let clienteId: number | undefined;
  if (usuario.papel === "cliente") {
    const cliente = getClientePorUsuarioId(usuario.id);
    clienteId = cliente?.id;
  }

  const token = await criarSessionToken({
    userId: usuario.id,
    papel: usuario.papel,
    nome: usuario.nome,
    clienteId,
  });
  await definirCookieSessao(token);

  // Código confirmado — este navegador vira confiável, então os próximos
  // logins (até 180 dias) pulam a verificação por e-mail.
  const dispositivoToken = criarDispositivoConfiavel(usuario.id);
  await definirCookieDispositivoConfiavel(dispositivoToken, VALIDADE_COOKIE_DISPOSITIVO_SEGUNDOS);

  return NextResponse.json({
    ok: true,
    papel: usuario.papel,
    nome: usuario.nome,
    clienteId,
    token,
    destino: usuario.papel === "consultor" ? "/consultor/dashboard" : "/cliente/carteira",
  });
}
