import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { getClientePorId, removerProvento } from "@/lib/repo";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; proventoId: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id, proventoId } = await ctx.params;
  const clienteId = Number(id);
  if (!getClientePorId(clienteId)) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }
  removerProvento(clienteId, Number(proventoId));
  return NextResponse.json({ ok: true });
}
