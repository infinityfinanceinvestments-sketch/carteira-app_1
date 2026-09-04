import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getObjetivoPorId,
  atualizarObjetivo,
  excluirObjetivo,
  calcularProgressoObjetivo,
} from "@/lib/repo";

const schemaAtualizar = z.object({
  titulo: z.string().trim().min(1).max(120).optional(),
  descricao: z.string().trim().max(500).nullable().optional(),
  ativo: z.string().trim().max(20).optional(),
  meta_quantidade: z.number().positive().optional(),
  meta_valor: z.number().positive().optional(),
  progresso_manual: z.number().min(0).optional(),
});

// Edição/exclusão é sempre coisa do consultor — o cliente só vê o
// progresso (GET fica na rota de listagem por cliente_id).
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const objetivo = getObjetivoPorId(Number(id));
  if (!objetivo) {
    return NextResponse.json({ erro: "Objetivo não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schemaAtualizar.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  atualizarObjetivo(objetivo.id, {
    ...parsed.data,
    ativo: parsed.data.ativo ? parsed.data.ativo.toUpperCase() : undefined,
  });
  const atualizado = getObjetivoPorId(objetivo.id)!;
  return NextResponse.json({ ok: true, objetivo: calcularProgressoObjetivo(atualizado) });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const objetivo = getObjetivoPorId(Number(id));
  if (!objetivo) {
    return NextResponse.json({ erro: "Objetivo não encontrado." }, { status: 404 });
  }
  excluirObjetivo(objetivo.id);
  return NextResponse.json({ ok: true });
}
