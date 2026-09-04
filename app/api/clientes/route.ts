import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest, hashSenha } from "@/lib/auth";
import {
  criarUsuario,
  criarCliente,
  listarClientes,
  getUsuarioPorEmail,
  getOuCriarContaManual,
  inserirPontoHistorico,
  valorTotalCarteira,
} from "@/lib/repo";

const schema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  perfil_risco: z.enum(["conservador", "moderado", "arrojado"]),
  objetivo: z.string().optional(),
  carteira_modelo_id: z.number().int().nullable().optional(),
  benchmark: z.string().default("CDI"),
  instituicao: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const clientes = listarClientes().map((c) => ({
    ...c,
    valorTotal: valorTotalCarteira(c.id),
  }));
  return NextResponse.json({ clientes });
}

export async function POST(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos.", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const dados = parsed.data;

  if (getUsuarioPorEmail(dados.email.toLowerCase())) {
    return NextResponse.json(
      { erro: "Já existe um usuário com esse e-mail." },
      { status: 409 }
    );
  }

  const senhaHash = await hashSenha(dados.senha);
  const usuarioId = criarUsuario(
    dados.email.toLowerCase(),
    senhaHash,
    "cliente",
    dados.nome
  );

  const clienteId = criarCliente({
    usuario_id: usuarioId,
    consultor_id: sessao.userId,
    nome: dados.nome,
    email: dados.email.toLowerCase(),
    perfil_risco: dados.perfil_risco,
    objetivo: dados.objetivo ?? null,
    carteira_modelo_id: dados.carteira_modelo_id ?? null,
    benchmark: dados.benchmark,
  });

  // Cria a conta inicial (manual) e um primeiro ponto de histórico em zero,
  // para o gráfico de evolução já ter uma base a partir de hoje.
  getOuCriarContaManual(clienteId, dados.instituicao);
  inserirPontoHistorico({
    cliente_id: clienteId,
    data: new Date().toISOString().slice(0, 10),
    valor_total: 0,
    valor_benchmark: 0,
  });

  return NextResponse.json({ ok: true, clienteId }, { status: 201 });
}
