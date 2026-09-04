import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  atualizarCarteiraModeloDoCliente,
  getClientePorId,
  listarPosicoesDoCliente,
  consolidarPosicoes,
  alocacaoPorClasse,
  desvioVsCarteiraModelo,
  listarRecomendacoesDoCliente,
  valorTotalCarteira,
  criarNotificacao,
  jaNotificouDesvioHoje,
} from "@/lib/repo";
import { atualizarPrecosDeMercado } from "@/lib/cotacoes";
import { garantirSnapshotDeHoje, obterHistoricoComBenchmark } from "@/lib/rentabilidade";
import { sincronizarProventosAutomaticos } from "@/lib/proventos-auto";

const schema = z.object({
  carteira_modelo_id: z.number().int().nullable(),
});

const LIMIAR_DESVIO_NOTIFICAVEL = 5; // pontos percentuais

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
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  // Antes de montar a resposta, tenta atualizar o valor das posições com a
  // cotação atual (ações/FIIs/ETFs). É "best effort": se a busca falhar (sem
  // internet, ticker não encontrado etc.) a tela segue com o último valor
  // conhecido — nunca derruba a requisição por causa disso.
  try {
    await atualizarPrecosDeMercado(listarPosicoesDoCliente(clienteId));
  } catch (erro) {
    console.error("Erro atualizando cotações de mercado", erro);
  }

  // Mesmo espírito da atualização de cotações acima (best effort), mas SEM
  // esperar a busca terminar (fire-and-forget): diferente da cotação (que
  // afeta o valor mostrado agora), proventos é secundário e a busca pode
  // envolver várias chamadas externas — bloquear a resposta por causa dela
  // deixaria a carteira mais lenta de abrir à toa. Roda em segundo plano e
  // grava no banco; se o provento mais novo ainda não tiver sido gravado a
  // tempo dessa resposta, aparece no próximo carregamento.
  sincronizarProventosAutomaticos(
    clienteId,
    consolidarPosicoes(listarPosicoesDoCliente(clienteId))
  ).catch((erro) => {
    console.error("Erro sincronizando proventos automáticos", erro);
  });

  const valorTotal = valorTotalCarteira(clienteId);
  garantirSnapshotDeHoje(clienteId, valorTotal);

  const desvios = desvioVsCarteiraModelo(clienteId);

  // Best-effort, igual à notificação de variação de preço: só persiste
  // quando é o próprio cliente vendo a carteira dele (evita que o consultor
  // navegando por vários clientes gere notificação em nome de todos eles) e
  // nunca deve derrubar a resposta principal por causa disso.
  if (sessao.papel === "cliente" && sessao.clienteId === clienteId && cliente.carteira_modelo_id) {
    try {
      for (const d of desvios) {
        if (Math.abs(d.desvio) < LIMIAR_DESVIO_NOTIFICAVEL) continue;
        if (jaNotificouDesvioHoje(clienteId, d.classe)) continue;
        const sinal = d.desvio >= 0 ? "+" : "";
        criarNotificacao({
          cliente_id: clienteId,
          tipo: "desvio_modelo",
          titulo: `Desvio em ${d.classe}`,
          mensagem: `${d.classe} está ${sinal}${d.desvio.toFixed(1)} pontos percentuais fora do alvo da carteira-modelo.`,
        });
      }
    } catch (erro) {
      console.error("Erro criando notificação de desvio de carteira-modelo", erro);
    }
  }

  return NextResponse.json({
    cliente,
    valorTotal,
    posicoes: consolidarPosicoes(listarPosicoesDoCliente(clienteId)),
    alocacaoPorClasse: alocacaoPorClasse(clienteId),
    desvioVsCarteiraModelo: desvios,
    historicoPatrimonio: await obterHistoricoComBenchmark(clienteId, cliente.benchmark),
    recomendacoes: listarRecomendacoesDoCliente(clienteId),
  });
}

export async function PATCH(
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
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  atualizarCarteiraModeloDoCliente(clienteId, parsed.data.carteira_modelo_id);
  return NextResponse.json({ ok: true });
}
