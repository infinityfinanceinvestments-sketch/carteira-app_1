import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { buscarCotacoesMercado } from "@/lib/mercado";
import { criarNotificacao, jaNotificouVariacaoHoje } from "@/lib/repo";

const LIMIAR_VARIACAO_NOTIFICAVEL = 5; // % no dia

// GET /api/mercado/cotacoes?tickers=BBAS3,BBSE3,PETR4
export async function GET(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const tickersParam = req.nextUrl.searchParams.get("tickers") ?? "";
  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tickers.length === 0) {
    return NextResponse.json({ cotacoes: [] });
  }
  if (tickers.length > 30) {
    return NextResponse.json(
      { erro: "Muitos tickers de uma vez (máximo 30)." },
      { status: 400 }
    );
  }

  const cotacoes = await buscarCotacoesMercado(tickers);

  // Best-effort: avisa o cliente quando um dos favoritos dele varia forte no
  // dia. Nunca deve derrubar a resposta principal de cotações.
  if (sessao.papel === "cliente" && sessao.clienteId) {
    try {
      for (const c of cotacoes) {
        if (c.erro || c.variacaoPercentual == null) continue;
        if (Math.abs(c.variacaoPercentual) < LIMIAR_VARIACAO_NOTIFICAVEL) continue;
        if (jaNotificouVariacaoHoje(sessao.clienteId, c.ticker)) continue;
        const sinal = c.variacaoPercentual >= 0 ? "+" : "";
        criarNotificacao({
          cliente_id: sessao.clienteId,
          tipo: "variacao_preco",
          titulo: `Variação em ${c.ticker}`,
          mensagem: `${c.ticker} variou ${sinal}${c.variacaoPercentual.toFixed(1)}% hoje.`,
        });
      }
    } catch (erro) {
      console.error("Erro criando notificação de variação de preço", erro);
    }
  }

  return NextResponse.json({ cotacoes });
}
