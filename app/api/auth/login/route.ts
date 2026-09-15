import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioPorEmail } from "@/lib/repo";
import { getClientePorUsuarioId } from "@/lib/repo";
import { criarCodigoVerificacao, dispositivoEhConfiavel } from "@/lib/repo";
import { enviarEmail, emailCodigoVerificacaoHtml, envioDeEmailHabilitado } from "@/lib/email";
import {
  verificarSenha,
  criarSessionToken,
  definirCookieSessao,
  criarPending2faToken,
  getCookieDispositivoConfiavelFromRequest,
} from "@/lib/auth";
import { identificarOrigem, registrarFalha, verificarLimite, limiteDeLoginAtivo } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
  // Só o login web manda isso como true — o app Android continua fazendo
  // login direto (sem 2FA), já que ele nem tem tela pra digitar o código.
  aceita2fa: z.boolean().optional(),
});

const JANELA_LIMITE_MS = 10 * 60 * 1000; // 10 minutos
const MAX_TENTATIVAS = 8;

export async function POST(req: NextRequest) {
  const origem = identificarOrigem(req);
  const chaveLimite = `login:${origem}`;
  if (limiteDeLoginAtivo()) {
    const limite = verificarLimite(chaveLimite, MAX_TENTATIVAS, JANELA_LIMITE_MS);
    if (!limite.permitido) {
      return NextResponse.json(
        {
          erro: `Muitas tentativas de login. Tente novamente em ${Math.ceil(
            limite.retryApósSegundos / 60
          )} min.`,
        },
        { status: 429, headers: { "Retry-After": String(limite.retryApósSegundos) } }
      );
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Informe e-mail e senha válidos." },
      { status: 400 }
    );
  }

  const { email, senha, aceita2fa } = parsed.data;
  const usuario = getUsuarioPorEmail(email.toLowerCase());
  if (!usuario) {
    if (limiteDeLoginAtivo()) registrarFalha(chaveLimite, JANELA_LIMITE_MS);
    return NextResponse.json(
      { erro: "E-mail ou senha incorretos." },
      { status: 401 }
    );
  }

  const senhaOk = await verificarSenha(senha, usuario.senha_hash);
  if (!senhaOk) {
    if (limiteDeLoginAtivo()) registrarFalha(chaveLimite, JANELA_LIMITE_MS);
    return NextResponse.json(
      { erro: "E-mail ou senha incorretos." },
      { status: 401 }
    );
  }

  // Verificação em duas etapas: só entra em ação se o cliente pedir
  // (aceita2fa — hoje só o app web manda isso), o envio de e-mail estiver
  // configurado (sem isso não tem como entregar o código) e este navegador
  // ainda não for reconhecido como confiável.
  if (aceita2fa && envioDeEmailHabilitado) {
    const dispositivoConfiavel = dispositivoEhConfiavel(
      usuario.id,
      getCookieDispositivoConfiavelFromRequest(req)
    );
    if (!dispositivoConfiavel) {
      const codigo = criarCodigoVerificacao(usuario.id);
      const resultado = await enviarEmail({
        to: usuario.email,
        subject: "Seu código de verificação — Infinity Trading",
        html: emailCodigoVerificacaoHtml({ nome: usuario.nome, codigo }),
      });
      if (resultado.enviado) {
        const pendingToken = await criarPending2faToken(usuario.id);
        return NextResponse.json({ precisaVerificar: true, pendingToken });
      }
      // E-mail configurado mas o envio falhou agora (provedor fora do ar,
      // por exemplo) — não trava o acesso por causa disso, só segue login
      // direto como se 2FA estivesse desligado.
      console.error("2FA: e-mail não enviado, seguindo sem verificação:", resultado.erro);
    }
  }

  let clienteId: number | undefined;
  if (usuario.papel === "cliente") {
    const cliente = getClientePorUsuarioId(usuario.id);
    clienteId = cliente?.id;
  }

  const token = await criarSessionToken({
    userId: usuario.id,
    papel: usuario.papel,
    nome: usuario.nome,
    clienteId,
  });
  await definirCookieSessao(token);

  return NextResponse.json({
    ok: true,
    papel: usuario.papel,
    nome: usuario.nome,
    clienteId,
    token,
    destino: usuario.papel === "consultor" ? "/consultor/dashboard" : "/cliente/carteira",
  });
}
