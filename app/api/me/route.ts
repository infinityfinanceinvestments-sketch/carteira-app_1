import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { getUsuarioPorId, getClientePorUsuarioId } from "@/lib/repo";

// Usado pelo app Android pra checar se o token salvo ainda é válido
// (por exemplo ao abrir o app) sem precisar pedir login/senha de novo, e
// também pela tela de Configurações pra mostrar o e-mail e (quando é
// cliente) o perfil de risco/benchmark sem precisar duplicar essa consulta
// em outro lugar — o token (JWT) não carrega e-mail, só busca no banco aqui.
export async function GET(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const usuario = getUsuarioPorId(sessao.userId);
  const cliente =
    sessao.papel === "cliente" ? getClientePorUsuarioId(sessao.userId) : undefined;
  return NextResponse.json({
    userId: sessao.userId,
    papel: sessao.papel,
    nome: sessao.nome,
    clienteId: sessao.clienteId ?? null,
    email: usuario?.email ?? null,
    perfilRisco: cliente?.perfil_risco ?? null,
    benchmark: cliente?.benchmark ?? null,
  });
}
