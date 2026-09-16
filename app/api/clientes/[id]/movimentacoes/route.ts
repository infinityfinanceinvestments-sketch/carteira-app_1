import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  criarMovimentacaoPendente,
  getClientePorId,
  getPosicaoComCliente,
  listarMovimentacoesDoCliente,
} from "@/lib/repo";
import { CLASSES_ATIVO } from "@/lib/types";

const schema = z.object({
  tipo: z.enum(["aporte", "retirada"]),
  // "existente": o cliente escolheu um ativo que já tem na carteira
  // (posicao_id obrigatório). "novo": só faz sentido em aporte — o cliente
  // está informando um ativo que ainda não está cadastrado.
  modo: z.enum(["existente", "novo"]),
  posicao_id: z.number().int().positive().optional(),
  ativo: z.string().trim().min(1).optional(),
  classe: z.enum(CLASSES_ATIVO).optional(),
  quantidade: z.number().positive().optional(),
  valor: z.number().positive(),
  observacao: z.string().trim().max(500).optional(),
});

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
  if (sessao.papel === "cliente" && sessao.clienteId !== clienteId) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  if (!getClientePorId(clienteId)) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }
  return NextResponse.json({
    movimentacoes: listarMovimentacoesDoCliente(clienteId),
  });
}

// POST /api/clientes/[id]/movimentacoes — cliente informa um aporte ou
// retirada que fez por fora do app (ainda não há integração automática com
// corretoras). Fica com status 'pendente' e não altera nada em `posicoes`
// até o consultor aprovar (ver PATCH em [movId]/route.ts) — só o consultor
// pode validar, o cliente nunca edita a própria posição direto.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  // Só o próprio cliente informa movimentação pra si mesmo — o consultor
  // lança posições diretamente pela tela de "Posições" (POST /posicoes),
  // que já pula a fila de aprovação.
  if (!sessao || sessao.papel !== "cliente") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  if (sessao.clienteId !== clienteId) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }
  if (!getClientePorId(clienteId)) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const dados = parsed.data;

  if (dados.tipo === "retirada" && dados.modo !== "existente") {
    return NextResponse.json(
      { erro: "Retirada só pode ser de um ativo que você já tem." },
      { status: 400 }
    );
  }

  let ativo: string;
  let classe: string;
  let posicaoId: number | null = null;

  if (dados.modo === "existente") {
    if (!dados.posicao_id) {
      return NextResponse.json(
        { erro: "Selecione o ativo existente." },
        { status: 400 }
      );
    }
    const posicao = getPosicaoComCliente(dados.posicao_id);
    // Garante que o posicao_id enviado é mesmo de uma posição desse
    // cliente — evita um cliente referenciar (por engano ou de propósito)
    // uma posição de outra carteira.
    if (!posicao || posicao.cliente_id !== clienteId) {
      return NextResponse.json({ erro: "Ativo não encontrado." }, { status: 404 });
    }
    ativo = posicao.ativo;
    classe = posicao.classe;
    posicaoId = posicao.id;
  } else {
    if (!dados.ativo || !dados.classe) {
      return NextResponse.json(
        { erro: "Informe o nome e a classe do ativo novo." },
        { status: 400 }
      );
    }
    ativo = dados.ativo;
    classe = dados.classe;
  }

  const movimentacaoId = criarMovimentacaoPendente({
    cliente_id: clienteId,
    tipo: dados.tipo,
    posicao_id: posicaoId,
    ativo,
    classe,
    quantidade: dados.quantidade ?? null,
    valor: dados.valor,
    observacao: dados.observacao?.trim() || null,
  });

  return NextResponse.json({ ok: true, movimentacaoId }, { status: 201 });
}
