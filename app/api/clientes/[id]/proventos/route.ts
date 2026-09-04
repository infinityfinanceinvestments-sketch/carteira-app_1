import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  listarProventosDoCliente,
  registrarProvento,
  totalProventosDoCliente,
} from "@/lib/repo";

const schema = z.object({
  ativo: z.string().min(1),
  tipo: z.enum(["dividendo", "jcp", "rendimento"]),
  valor: z.number().positive(),
  data_pagamento: z.string().min(1),
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
    proventos: listarProventosDoCliente(clienteId),
    total: totalProventosDoCliente(clienteId),
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

  const proventoId = registrarProvento({ cliente_id: clienteId, ...parsed.data });
  return NextResponse.json({ ok: true, proventoId }, { status: 201 });
}
