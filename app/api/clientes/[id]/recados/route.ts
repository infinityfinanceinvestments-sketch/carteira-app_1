import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { getClientePorId, listarRecadosDoConsultor } from "@/lib/repo";

// Lado do cliente: lê os recados do PRÓPRIO consultor (broadcast — não é por
// cliente). Se o cliente não tiver consultor_id definido, devolve lista
// vazia em vez de erro (não é um estado inválido, só não há recados a
// mostrar ainda).
export async function GET(
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
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }
  return NextResponse.json({
    recados: cliente.consultor_id ? listarRecadosDoConsultor(cliente.consultor_id) : [],
  });
}
