import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashSenha } from "@/lib/auth";
import {
  atualizarSenhaUsuario,
  getTokenRedefinicaoValido,
  marcarTokenRedefinicaoUsado,
} from "@/lib/repo";

const schema = z.object({
  token: z.string().min(1),
  novaSenha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

// POST /api/redefinir-senha — pública. Valida o token de uso único e troca
// a senha do usuário dono do token.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const registro = getTokenRedefinicaoValido(parsed.data.token);
  if (!registro) {
    return NextResponse.json(
      { erro: "Link inválido ou expirado. Peça um novo link ao seu consultor." },
      { status: 400 }
    );
  }

  const novoHash = await hashSenha(parsed.data.novaSenha);
  atualizarSenhaUsuario(registro.usuario_id, novoHash);
  marcarTokenRedefinicaoUsado(registro.id);

  return NextResponse.json({ ok: true });
}
