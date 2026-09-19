import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import { atualizarConfiguracaoFee, getClientePorId, registrarAuditoria } from "@/lib/repo";

const schema = z.object({
  valor_fee: z.number().positive().nullable(),
  dia_vencimento_fee: z.number().int().min(1).max(31).nullable(),
});

// PATCH /api/clientes/[id]/fee — o consultor define (ou limpa, voltando pra
// "a definir") o valor do fee mensal e o dia de vencimento combinado com o
// cliente. Ver components/PagamentoFeeSection.tsx.
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

  atualizarConfiguracaoFee(clienteId, parsed.data);

  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "fee_atualizado",
    detalhes: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
