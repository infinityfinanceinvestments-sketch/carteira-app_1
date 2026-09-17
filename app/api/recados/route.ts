import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import { criarRecado, listarRecadosDoConsultor } from "@/lib/repo";

const schema = z.object({
  mensagem: z.string().trim().min(1).max(1000),
});

// Mural de recados do consultor — só ele vê/posta os próprios (não existe
// "recados de todo mundo" nessa rota; o cliente lê pelo lado dele em
// /api/clientes/[id]/recados, que busca pelo consultor_id do cliente).
export async function GET(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json({ recados: listarRecadosDoConsultor(sessao.userId) });
}

export async function POST(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Escreva uma mensagem." }, { status: 400 });
  }

  const id = criarRecado(sessao.userId, parsed.data.mensagem);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
