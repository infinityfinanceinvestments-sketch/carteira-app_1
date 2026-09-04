import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import { getRecomendacaoPorId, atualizarStatusRecomendacao } from "@/lib/repo";

const schema = z.object({
  status: z.enum([
    "pendente",
    "enviada",
    "aceita",
    "recusada",
    "executada",
    "expirada",
  ]),
});

const STATUS_PERMITIDOS_CLIENTE = ["aceita", "recusada", "executada"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const recomendacao = getRecomendacaoPorId(Number(id));
  if (!recomendacao) {
    return NextResponse.json({ erro: "Recomendação não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Status inválido." }, { status: 400 });
  }

  if (sessao.papel === "cliente") {
    if (sessao.clienteId !== recomendacao.cliente_id) {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
    }
    if (!STATUS_PERMITIDOS_CLIENTE.includes(parsed.data.status)) {
      return NextResponse.json(
        { erro: "Cliente só pode aceitar, recusar ou marcar como executada." },
        { status: 403 }
      );
    }
  }
  // Consultor pode alterar para qualquer status.

  atualizarStatusRecomendacao(recomendacao.id, parsed.data.status);
  return NextResponse.json({ ok: true });
}
