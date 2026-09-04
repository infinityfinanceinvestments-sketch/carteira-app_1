import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  criarCarteiraModelo,
  substituirAlocacoesAlvo,
  listarCarteirasModelo,
  listarAlocacoesAlvo,
} from "@/lib/repo";

const schema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  alocacoes: z
    .array(z.object({ classe: z.string(), percentual_alvo: z.number() }))
    .default([]),
});

export async function GET(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const carteiras = listarCarteirasModelo().map((c) => ({
    ...c,
    alocacoes: listarAlocacoesAlvo(c.id),
  }));
  return NextResponse.json({ carteirasModelo: carteiras });
}

export async function POST(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const id = criarCarteiraModelo(parsed.data.nome, parsed.data.descricao ?? null);
  if (parsed.data.alocacoes.length > 0) {
    substituirAlocacoesAlvo(id, parsed.data.alocacoes);
  }

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
