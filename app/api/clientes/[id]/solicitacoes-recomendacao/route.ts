import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  criarSolicitacaoRecomendacao,
  getClientePorId,
  getSolicitacaoPendenteDoCliente,
} from "@/lib/repo";

const schema = z.object({
  mensagem: z.string().trim().max(500).optional(),
});

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
  if (!getClientePorId(clienteId)) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }
  return NextResponse.json({
    pendente: getSolicitacaoPendenteDoCliente(clienteId) ?? null,
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  // Só o próprio cliente pede recomendação pra si mesmo — o consultor não
  // teria motivo pra "pedir" em nome do cliente por essa rota.
  if (!sessao || sessao.papel !== "cliente") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  if (sessao.clienteId !== clienteId) {
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

  // Idempotente: se já tem um pedido em aberto, não duplica — só devolve o
  // que já existe (evita spam se o cliente clicar mais de uma vez).
  const existente = getSolicitacaoPendenteDoCliente(clienteId);
  if (existente) {
    return NextResponse.json({ ok: true, solicitacaoId: existente.id, jaExistia: true });
  }

  const solicitacaoId = criarSolicitacaoRecomendacao(
    clienteId,
    parsed.data.mensagem?.trim() || null
  );
  return NextResponse.json({ ok: true, solicitacaoId }, { status: 201 });
}
