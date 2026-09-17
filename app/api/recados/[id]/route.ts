import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { excluirRecado, getRecadoPorId } from "@/lib/repo";

// Consultor apaga um recado próprio — não dá pra apagar recado de outro
// consultor (checa consultor_id === sessao.userId antes de excluir).
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const recado = getRecadoPorId(Number(id));
  if (!recado) {
    return NextResponse.json({ erro: "Recado não encontrado." }, { status: 404 });
  }
  if (recado.consultor_id !== sessao.userId) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  excluirRecado(recado.id);
  return NextResponse.json({ ok: true });
}
