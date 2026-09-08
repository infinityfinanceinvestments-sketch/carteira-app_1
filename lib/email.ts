import { Resend } from "resend";

// Envio de e-mail é opcional: sem RESEND_API_KEY configurada, o app
// continua funcionando do jeito que já funcionava (links gerados na tela
// pro consultor repassar manualmente). Isso deixa o recurso "pronto pra
// ligar" assim que o Pedro criar uma conta em resend.com e configurar a
// variável de ambiente — sem quebrar nada enquanto isso não acontece.
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export const envioDeEmailHabilitado = Boolean(resend);

// Endereço de remetente. O domínio "resend.dev" é um sandbox de teste que só
// entrega pro e-mail com o qual você criou a conta Resend — pra mandar de
// verdade pros clientes é preciso verificar um domínio próprio (ex.:
// naoresponda@infinitytrading.com.br) no painel da Resend e trocar aqui.
const REMETENTE = process.env.RESEND_FROM_EMAIL || "Infinity Trading <onboarding@resend.dev>";

export interface ResultadoEnvioEmail {
  enviado: boolean;
  erro?: string;
}

export async function enviarEmail(opcoes: {
  to: string;
  subject: string;
  html: string;
}): Promise<ResultadoEnvioEmail> {
  if (!resend) {
    return { enviado: false, erro: "Envio de e-mail não configurado (RESEND_API_KEY ausente)." };
  }
  try {
    const resultado = await resend.emails.send({
      from: REMETENTE,
      to: opcoes.to,
      subject: opcoes.subject,
      html: opcoes.html,
    });
    if (resultado.error) {
      console.error("Erro enviando e-mail (Resend):", resultado.error);
      return { enviado: false, erro: resultado.error.message };
    }
    return { enviado: true };
  } catch (erro) {
    console.error("Erro enviando e-mail:", erro);
    return { enviado: false, erro: "Falha de conexão ao enviar e-mail." };
  }
}

const ESTILO_BASE = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1f3a; color: #ffffff; padding: 32px 24px; border-radius: 16px;`;

export function emailRedefinicaoSenhaHtml(opcoes: { nome: string; link: string }): string {
  return `
    <div style="${ESTILO_BASE}">
      <h1 style="font-size: 18px; margin: 0 0 12px;">Redefinição de senha</h1>
      <p style="font-size: 14px; color: #b9c7e0; line-height: 1.5;">
        Olá, ${opcoes.nome}. Recebemos (ou seu consultor solicitou) um pedido pra redefinir
        a senha da sua conta no Infinity Trading. O link abaixo é válido por 1 hora e só
        pode ser usado uma vez.
      </p>
      <p style="margin: 20px 0;">
        <a href="${opcoes.link}" style="background:#2f6fed; color:#fff; padding:10px 20px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">Redefinir minha senha</a>
      </p>
      <p style="font-size: 12px; color: #7d8fb0;">
        Se você não pediu isso, pode ignorar este e-mail com segurança.
      </p>
    </div>
  `;
}

export function emailCodigoVerificacaoHtml(opcoes: { nome: string; codigo: string }): string {
  return `
    <div style="${ESTILO_BASE}">
      <h1 style="font-size: 18px; margin: 0 0 12px;">Confirme que é você</h1>
      <p style="font-size: 14px; color: #b9c7e0; line-height: 1.5;">
        Olá, ${opcoes.nome}. Detectamos um acesso a partir de um novo dispositivo/navegador
        na sua conta do Infinity Trading. Use o código abaixo pra confirmar — ele vale por
        10 minutos.
      </p>
      <p style="margin: 20px 0; font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center;">
        ${opcoes.codigo}
      </p>
      <p style="font-size: 12px; color: #7d8fb0;">
        Se não foi você tentando entrar, troque sua senha assim que possível.
      </p>
    </div>
  `;
}
