import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  aplicarAporteEmPosicao,
  aplicarRetiradaEmPosicao,
  criarNotificacao,
  getClientePorId,
  getMovimentacaoPorId,
  getOuCriarContaManual,
  getPosicaoComCliente,
  inserirPosicao,
  registrarAuditoria,
  responderMovimentacaoPendente,
  substituirPontoHistoricoDoDia,
  valorTotalCarteira,
} from "@/lib/repo";

// Conta "guarda-chuva" pra ativos novos aprovados por aqui — mesmo nome
// usado no lançamento manual avulso (ver app/api/clientes/[id]/posicoes/route.ts),
// assim os dois jeitos de lançar um ativo único vivem na mesma conta e não
// somem numa reimportação de CSV/B3 (que só limpa a própria conta/instituição).
const INSTITUICAO_LANCAMENTO_AVULSO = "Lançamento avulso";

const schema = z.object({
  status: z.enum(["aprovada", "recusada"]),
  nota_consultor: z.string().trim().max(500).optional(),
  // O consultor pode ajustar o valor/quantidade antes de aprovar (ex: o
  // cliente arredondou, ou a cotação mudou) — se não vier, usa o que o
  // cliente informou.
  valor: z.number().positive().optional(),
  quantidade: z.number().positive().nullable().optional(),
});

// PATCH /api/clientes/[id]/movimentacoes/[movId] — só o consultor decide.
// Aprovar de fato altera `posicoes` (ver aplicarAporteEmPosicao/
// aplicarRetiradaEmPosicao); recusar só fecha o pedido sem mexer em nada.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; movId: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id, movId } = await ctx.params;
  const clienteId = Number(id);
  const movimentacaoId = Number(movId);
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const movimentacao = getMovimentacaoPorId(movimentacaoId);
  if (!movimentacao || movimentacao.cliente_id !== clienteId) {
    return NextResponse.json({ erro: "Movimentação não encontrada." }, { status: 404 });
  }
  if (movimentacao.status !== "pendente") {
    return NextResponse.json(
      { erro: "Essa movimentação já foi respondida." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const dados = parsed.data;
  const notaConsultor = dados.nota_consultor?.trim() || null;

  if (dados.status === "recusada") {
    responderMovimentacaoPendente(movimentacaoId, "recusada", notaConsultor);
    criarNotificacao({
      cliente_id: clienteId,
      tipo: "movimentacao",
      titulo: `${movimentacao.tipo === "aporte" ? "Aporte" : "Retirada"} recusado`,
      mensagem: notaConsultor
        ? `${movimentacao.ativo}: ${notaConsultor}`
        : `Seu consultor recusou o ${movimentacao.tipo === "aporte" ? "aporte" : "a retirada"} informado em ${movimentacao.ativo}.`,
      referencia_id: movimentacaoId,
    });
    return NextResponse.json({ ok: true, status: "recusada" });
  }

  // Aprovando: aplica o efeito real na posição antes de marcar o pedido
  // como resolvido, pra nunca ficar com um status "aprovada" sem o valor
  // ter de fato entrado/saído da carteira.
  const valor = dados.valor ?? movimentacao.valor;
  const quantidade =
    dados.quantidade !== undefined ? dados.quantidade : movimentacao.quantidade;

  if (movimentacao.tipo === "aporte") {
    if (movimentacao.posicao_id) {
      const posicao = getPosicaoComCliente(movimentacao.posicao_id);
      if (!posicao || posicao.cliente_id !== clienteId) {
        return NextResponse.json(
          { erro: "A posição original não existe mais — ajuste manualmente pela tela de Posições." },
          { status: 409 }
        );
      }
      aplicarAporteEmPosicao(movimentacao.posicao_id, valor, quantidade ?? null);
    } else {
      const contaId = getOuCriarContaManual(clienteId, INSTITUICAO_LANCAMENTO_AVULSO);
      const quantidadeFinal = quantidade && quantidade > 0 ? quantidade : 1;
      inserirPosicao({
        conta_id: contaId,
        ativo: movimentacao.ativo,
        classe: movimentacao.classe,
        quantidade: quantidadeFinal,
        preco_medio: valor / quantidadeFinal,
        valor_atual: valor,
      });
    }
  } else {
    if (!movimentacao.posicao_id) {
      return NextResponse.json(
        { erro: "Retirada sem ativo associado — não é possível aprovar." },
        { status: 400 }
      );
    }
    const posicao = getPosicaoComCliente(movimentacao.posicao_id);
    if (!posicao || posicao.cliente_id !== clienteId) {
      return NextResponse.json(
        { erro: "A posição original não existe mais — ajuste manualmente pela tela de Posições." },
        { status: 409 }
      );
    }
    aplicarRetiradaEmPosicao(movimentacao.posicao_id, valor, quantidade ?? null);
  }

  const novoTotal = valorTotalCarteira(clienteId);
  substituirPontoHistoricoDoDia(clienteId, new Date().toISOString().slice(0, 10), novoTotal);

  responderMovimentacaoPendente(movimentacaoId, "aprovada", notaConsultor);

  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "movimentacao_aprovada",
    detalhes: {
      movimentacaoId,
      tipo: movimentacao.tipo,
      ativo: movimentacao.ativo,
      valor,
      quantidade,
    },
  });

  criarNotificacao({
    cliente_id: clienteId,
    tipo: "movimentacao",
    titulo: `${movimentacao.tipo === "aporte" ? "Aporte" : "Retirada"} aprovado`,
    mensagem: `Seu consultor confirmou o ${movimentacao.tipo === "aporte" ? "aporte" : "a retirada"} em ${movimentacao.ativo}.`,
    referencia_id: movimentacaoId,
  });

  return NextResponse.json({ ok: true, status: "aprovada" });
}
