import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  listarObjetivosComProgresso,
  criarObjetivo,
} from "@/lib/repo";

const schemaCriar = z
  .object({
    titulo: z.string().trim().min(1).max(120),
    descricao: z.string().trim().max(500).optional(),
    tipo: z.enum(["quantidade_ativo", "valor_livre"]),
    ativo: z.string().trim().max(20).optional(),
    meta_quantidade: z.number().positive().optional(),
    meta_valor: z.number().positive().optional(),
  })
  .refine(
    (d) => (d.tipo === "quantidade_ativo" ? !!d.ativo && !!d.meta_quantidade : !!d.meta_valor),
    { message: "Dados incompletos pro tipo de objetivo escolhido." }
  );

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
  return NextResponse.json({ objetivos: listarObjetivosComProgresso(clienteId) });
}

// Só o consultor traça objetivos com o cliente — o cliente só acompanha
// (vê a barra de progresso), não cria/edita as metas dele mesmo.
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
  const parsed = schemaCriar.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const objetivoId = criarObjetivo({
    cliente_id: clienteId,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao ?? null,
    tipo: parsed.data.tipo,
    ativo: parsed.data.tipo === "quantidade_ativo" ? parsed.data.ativo!.toUpperCase() : null,
    meta_quantidade: parsed.data.tipo === "quantidade_ativo" ? parsed.data.meta_quantidade : null,
    meta_valor: parsed.data.tipo === "valor_livre" ? parsed.data.meta_valor : null,
  });
  return NextResponse.json({ ok: true, objetivoId }, { status: 201 });
}
