import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  listarPosicoesDoCliente,
  atualizarIndexadorPosicao,
  registrarAuditoria,
} from "@/lib/repo";

// Indicadores com atualização automática suportada hoje — ver
// lib/rendaFixaIndexada.ts. Lista pequena de propósito: adicionar um novo
// (ex: IPCA+) precisa de lógica própria de cálculo lá, não só cadastrar o
// nome aqui.
const INDICADORES_SUPORTADOS = ["CDI"] as const;

const schema = z
  .object({
    indexador: z.enum(INDICADORES_SUPORTADOS).nullable(),
    indexador_percentual: z.number().positive().nullable(),
  })
  .refine((d) => (d.indexador == null) === (d.indexador_percentual == null), {
    message: "Informe o indexador e o percentual juntos, ou nenhum dos dois (pra remover).",
  });

// PATCH /api/clientes/[id]/posicoes/[posicaoId] — marca (ou desmarca) uma
// posição de Renda Fixa como indexada a um indicador (hoje só CDI), pra
// ligar a atualização automática de valor de lib/rendaFixaIndexada.ts.
// Só mexe em `indexador`/`indexador_percentual` — ativo, quantidade, preço
// médio e valor atual continuam exatamente como estavam.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; posicaoId: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id, posicaoId } = await ctx.params;
  const clienteId = Number(id);
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  // Confirma que a posição realmente pertence a esse cliente antes de
  // mexer nela — evita que o id da posição na URL aponte pra carteira de
  // outro cliente.
  const posicao = listarPosicoesDoCliente(clienteId).find((p) => p.id === Number(posicaoId));
  if (!posicao) {
    return NextResponse.json({ erro: "Posição não encontrada." }, { status: 404 });
  }
  if (posicao.classe !== "Renda Fixa") {
    return NextResponse.json(
      { erro: "Atualização automática por indexador só se aplica a posições de Renda Fixa." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const { indexador, indexador_percentual } = parsed.data;
  atualizarIndexadorPosicao(posicao.id, indexador, indexador_percentual);

  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "posicao_indexador_atualizado",
    detalhes: { posicaoId: posicao.id, ativo: posicao.ativo, indexador, indexador_percentual },
  });

  return NextResponse.json({ ok: true });
}
