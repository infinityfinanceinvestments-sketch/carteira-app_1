import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { getClientePorId, removerFavorito } from "@/lib/repo";

function podeAcessar(
  sessao: { papel: string; clienteId?: number },
  clienteId: number
): boolean {
  if (sessao.papel === "consultor") return true;
  return sessao.papel === "cliente" && sessao.clienteId === clienteId;
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; ticker: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id, ticker } = await ctx.params;
  const clienteId = Number(id);
  if (!podeAcessar(sessao, clienteId)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  removerFavorito(clienteId, decodeURIComponent(ticker));
  return NextResponse.json({ ok: true });
}
