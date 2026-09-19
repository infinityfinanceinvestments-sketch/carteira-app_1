import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  marcarPagamento,
  mesReferenciaAtual,
  registrarAuditoria,
} from "@/lib/repo";

const schema = z.object({ pago: z.boolean() });

// PATCH /api/clientes/[id]/pagamento-fee — o consultor marca (ou desmarca)
// o pagamento do fee do MÊS ATUAL pro cliente. Só mexe no mês corrente de
// propósito: não dá pra marcar retroativamente por essa rota (ver
// mesReferenciaAtual em lib/repo/pagamentos.ts).
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const mes = mesReferenciaAtual();
  marcarPagamento(clienteId, mes, parsed.data.pago);

  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "pagamento_fee_atualizado",
    detalhes: { mes_referencia: mes, pago: parsed.data.pago },
  });

  return NextResponse.json({ ok: true });
}
