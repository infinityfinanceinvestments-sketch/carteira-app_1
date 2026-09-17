import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import { getClientePorId, atualizarContatoCliente, registrarAuditoria } from "@/lib/repo";

// PATCH /api/clientes/[id]/perfil — o PRÓPRIO cliente edita seus dados de
// CONTATO (e-mail e telefone) na tela "Meu perfil". Rota separada de
// app/api/clientes/[id]/dados/route.ts (que é só do consultor e também
// mexe em nome/perfil de risco/objetivo) — aqui o cliente só pode tocar no
// próprio contato, nunca no e-mail de LOGIN (usuarios.email) nem no perfil
// de risco, que continuam sob controle do consultor.
const schema = z.object({
  email: z.string().trim().email(),
  telefone: z.string().trim().min(1).nullable(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "cliente") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  if (sessao.clienteId !== clienteId) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Informe um e-mail válido." }, { status: 400 });
  }
  const dados = parsed.data;
  const emailNovo = dados.email.toLowerCase();

  atualizarContatoCliente(clienteId, { email: emailNovo, telefone: dados.telefone });
  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "cliente_contato_atualizado",
    detalhes: { email: emailNovo, telefone: dados.telefone },
  });

  return NextResponse.json({ ok: true });
}
