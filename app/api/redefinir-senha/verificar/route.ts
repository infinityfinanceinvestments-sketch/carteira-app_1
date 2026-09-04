import { NextRequest, NextResponse } from "next/server";
import { getTokenRedefinicaoValido, getUsuarioPorId } from "@/lib/repo";

// GET /api/redefinir-senha/verificar?token=... — pública (quem está
// tentando redefinir a senha ainda não está logado). Só confirma se o link
// ainda é válido e devolve o primeiro nome pra personalizar a tela.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const registro = getTokenRedefinicaoValido(token);
  if (!registro) {
    return NextResponse.json({ valido: false });
  }
  const usuario = getUsuarioPorId(registro.usuario_id);
  return NextResponse.json({ valido: true, nome: usuario?.nome?.split(" ")[0] ?? null });
}
