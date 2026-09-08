import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { criarTokenRedefinicao, getClientePorUsuarioId, getUsuarioPorId } from "@/lib/repo";
import { enviarEmail, emailRedefinicaoSenhaHtml, envioDeEmailHabilitado } from "@/lib/email";

// POST /api/usuarios/:id/gerar-redefinicao — só o consultor pode gerar.
// Se o envio automático de e-mail estiver configurado (RESEND_API_KEY),
// manda o link direto pro cliente também; se não estiver, ou se o envio
// falhar por qualquer motivo, o comportamento de sempre continua valendo:
// o consultor recebe o link aqui e repassa por fora (whatsapp etc). O
// token vale por 1h e só pode ser usado uma vez.
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

  let emailEnviado = false;
  if (envioDeEmailHabilitado) {
    const origem = req.headers.get("origin") ?? new URL(req.url).origin;
    const link = `${origem}/redefinir-senha?token=${registro.token}`;
    const resultado = await enviarEmail({
      to: usuario.email,
      subject: "Redefinição de senha — Infinity Trading",
      html: emailRedefinicaoSenhaHtml({ nome: usuario.nome, link }),
    });
    emailEnviado = resultado.enviado;
  }

  return NextResponse.json({
    token: registro.token,
    expiraEm: registro.expira_em,
    emailEnviado,
  });
}
