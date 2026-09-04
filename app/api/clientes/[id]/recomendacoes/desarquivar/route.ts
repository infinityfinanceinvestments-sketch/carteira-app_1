import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import { desarquivarRecomendacoes, getClientePorId } from "@/lib/repo";

const schema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
});

/** Desfaz um "Limpar aceitas/expiradas" — usado pelo botão "Desfazer" que
 *  aparece por alguns segundos depois da limpeza, caso o usuário tenha
 *  clicado sem querer. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  if (sessao.papel === "cliente" && sessao.clienteId !== clienteId) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  if (!getClientePorId(clienteId)) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const quantidade = desarquivarRecomendacoes(clienteId, parsed.data.ids);
  return NextResponse.json({ ok: true, quantidade });
}
