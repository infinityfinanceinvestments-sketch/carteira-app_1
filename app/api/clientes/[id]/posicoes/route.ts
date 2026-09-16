import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  getOuCriarContaManual,
  inserirPosicao,
  valorTotalCarteira,
  substituirPontoHistoricoDoDia,
  registrarAuditoria,
} from "@/lib/repo";
import { CLASSES_ATIVO } from "@/lib/types";

// Conta "guarda-chuva" pra ativos lançados um a um por aqui — nome próprio
// (diferente de "Manual", que é o padrão do importador de CSV quando o
// consultor não digita uma instituição) justamente pra reimportar um CSV
// sem instituição não apagar esses lançamentos avulsos por engano.
const INSTITUICAO_LANCAMENTO_AVULSO = "Lançamento avulso";

const schema = z.object({
  ativo: z.string().trim().min(1),
  classe: z.enum(CLASSES_ATIVO),
  quantidade: z.number().positive(),
  preco_medio: z.number().nonnegative(),
  valor_atual: z.number().nonnegative(),
});

// POST /api/clientes/[id]/posicoes — lança UM ativo na carteira do cliente,
// somando às posições existentes (ao contrário do importador de CSV/B3, que
// substitui tudo daquela conta). Pensado pra ativos que a importação da B3
// não cobre — ex: ações e ETFs internacionais, contas em corretoras
// estrangeiras — sem precisar montar um CSV pra lançar um item só.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Preencha ativo, classe, quantidade, preço médio e valor atual corretamente." },
      { status: 400 }
    );
  }

  const contaId = getOuCriarContaManual(clienteId, INSTITUICAO_LANCAMENTO_AVULSO);
  const posicaoId = inserirPosicao({ conta_id: contaId, ...parsed.data });

  const novoTotal = valorTotalCarteira(clienteId);
  substituirPontoHistoricoDoDia(
    clienteId,
    new Date().toISOString().slice(0, 10),
    novoTotal
  );

  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "posicao_manual_adicionada",
    detalhes: { posicaoId, ...parsed.data },
  });

  return NextResponse.json({ ok: true, id: posicaoId });
}
