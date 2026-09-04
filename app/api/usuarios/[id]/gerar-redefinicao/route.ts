import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { criarTokenRedefinicao, getClientePorUsuarioId, getUsuarioPorId } from "@/lib/repo";

// POST /api/usuarios/:id/gerar-redefinicao — só o consultor pode gerar. Sem
// servidor de e-mail configurado, o app não manda nada automaticamente: o
// consultor recebe o link aqui e repassa pro cliente por fora (whatsapp,
// e-mail pessoal etc). O token vale por 1h e só pode ser usado uma vez.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const usuarioId = Number(id);
  const usuario = getUsuarioPorId(usuarioId);
  if (!usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  // Só deixa gerar link pro próprio consultor (a si mesmo) ou pra um cliente
  // que esteja sob esse consultor.
  if (usuarioId !== sessao.userId) {
    const cliente = getClientePorUsuarioId(usuarioId);
    if (!cliente || cliente.consultor_id !== sessao.userId) {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
    }
  }

  const registro = criarTokenRedefinicao(usuarioId);
  return NextResponse.json({ token: registro.token, expiraEm: registro.expira_em });
}
