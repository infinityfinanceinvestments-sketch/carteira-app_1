import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  substituirAlocacoesAlvo,
  getCarteiraModeloPorId,
  listarAlocacoesAlvo,
} from "@/lib/repo";

const schema = z.object({
  alocacoes: z.array(
    z.object({ classe: z.string(), percentual_alvo: z.number() })
  ),
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
  const carteiraModelo = getCarteiraModeloPorId(Number(id));
  if (!carteiraModelo) {
    return NextResponse.json({ erro: "Carteira-modelo não encontrada." }, { status: 404 });
  }
  return NextResponse.json({
    carteiraModelo,
    alocacoes: listarAlocacoesAlvo(Number(id)),
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const carteiraModelo = getCarteiraModeloPorId(Number(id));
  if (!carteiraModelo) {
    return NextResponse.json({ erro: "Carteira-modelo não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  substituirAlocacoesAlvo(Number(id), parsed.data.alocacoes);
  return NextResponse.json({ ok: true });
}
