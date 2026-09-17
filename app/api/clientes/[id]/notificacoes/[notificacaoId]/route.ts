import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { getClientePorId, marcarNotificacaoLida } from "@/lib/repo";

// Marca UMA notificação específica como lida — diferente de
// /notificacoes/marcar-lidas (que marca todas de uma vez, usado ao abrir o
// sino). Usado pelo popup de novidades da tela inicial (ver
// components/NovidadesPopup.tsx), que só deve "consumir" as notificações que
// ele de fato mostrou, sem esconder do sino outras notificações não
// relacionadas (ex: variação de preço) que o cliente ainda não viu.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; notificacaoId: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id, notificacaoId } = await ctx.params;
  const clienteId = Number(id);
  if (sessao.papel === "cliente" && sessao.clienteId !== clienteId) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  if (!getClientePorId(clienteId)) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }
  marcarNotificacaoLida(clienteId, Number(notificacaoId));
  return NextResponse.json({ ok: true });
}
