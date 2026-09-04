import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  listarFavoritosDoCliente,
  adicionarFavorito,
} from "@/lib/repo";

const schema = z.object({
  ticker: z.string().trim().min(1).max(20),
});

function podeAcessar(
  sessao: { papel: string; clienteId?: number },
  clienteId: number
): boolean {
  if (sessao.papel === "consultor") return true;
  return sessao.papel === "cliente" && sessao.clienteId === clienteId;
}

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
  if (!podeAcessar(sessao, clienteId)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ favoritos: listarFavoritosDoCliente(clienteId) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  if (!podeAcessar(sessao, clienteId)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Informe um ticker válido." }, { status: 400 });
  }

  const favorito = adicionarFavorito(clienteId, parsed.data.ticker);
  return NextResponse.json({ ok: true, favorito });
}
