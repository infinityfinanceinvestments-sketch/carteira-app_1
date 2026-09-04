import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  criarNotificacao,
  criarRecomendacao,
  getClientePorId,
  listarRecomendacoesDoCliente,
  marcarSolicitacoesAtendidas,
} from "@/lib/repo";

const ROTULO_OPERACAO: Record<string, string> = {
  compra: "Compra",
  venda: "Venda",
  manutencao: "Manutenção",
  rebalanceamento: "Rebalanceamento",
};

const schema = z.object({
  ativo: z.string().min(1),
  classe: z.string().min(1),
  tipo_operacao: z.enum(["compra", "venda", "manutencao", "rebalanceamento"]),
  justificativa: z.string().min(3),
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
    recomendacoes: listarRecomendacoesDoCliente(clienteId),
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  if (!getClientePorId(clienteId)) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const recomendacaoId = criarRecomendacao({
    cliente_id: clienteId,
    ...parsed.data,
    status: "enviada",
  });

  // Se o cliente tinha pedido uma recomendação, essa aqui já responde o
  // pedido — fecha automaticamente, sem depender do consultor lembrar de
  // marcar manualmente.
  marcarSolicitacoesAtendidas(clienteId);

  criarNotificacao({
    cliente_id: clienteId,
    tipo: "recomendacao",
    titulo: "Nova recomendação",
    mensagem: `${ROTULO_OPERACAO[parsed.data.tipo_operacao] ?? parsed.data.tipo_operacao} de ${parsed.data.ativo}`,
    referencia_id: recomendacaoId,
  });

  return NextResponse.json({ ok: true, recomendacaoId }, { status: 201 });
}
