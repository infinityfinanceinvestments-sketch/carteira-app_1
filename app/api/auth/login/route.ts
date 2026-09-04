import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioPorEmail } from "@/lib/repo";
import { getClientePorUsuarioId } from "@/lib/repo";
import {
  verificarSenha,
  criarSessionToken,
  definirCookieSessao,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Informe e-mail e senha válidos." },
      { status: 400 }
    );
  }

  const { email, senha } = parsed.data;
  const usuario = getUsuarioPorEmail(email.toLowerCase());
  if (!usuario) {
    return NextResponse.json(
      { erro: "E-mail ou senha incorretos." },
      { status: 401 }
    );
  }

  const senhaOk = await verificarSenha(senha, usuario.senha_hash);
  if (!senhaOk) {
    return NextResponse.json(
      { erro: "E-mail ou senha incorretos." },
      { status: 401 }
    );
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

  return NextResponse.json({
    ok: true,
    papel: usuario.papel,
    nome: usuario.nome,
    clienteId,
    token,
    destino: usuario.papel === "consultor" ? "/consultor/dashboard" : "/cliente/carteira",
  });
}
