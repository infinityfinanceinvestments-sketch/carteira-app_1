import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { getClientePorId, listarHistoricoPatrimonio } from "@/lib/repo";
import {
  buscarSerieIndicador,
  valorMaisProximo,
  INDICADORES_VALIDOS,
  type Indicador,
} from "@/lib/indices";

// Compara a evolução do patrimônio do cliente com um indicador de mercado
// (CDI, IPCA, IBOV ou S&P 500). Retorna os valores brutos alinhados por data
// — carteira e indicador — pra que o app decida como normalizar/exibir
// (ex: % de variação dentro do período filtrado na tela).
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

  const indicadorParam = (req.nextUrl.searchParams.get("indicador") ?? "CDI").toUpperCase();
  if (!INDICADORES_VALIDOS.includes(indicadorParam as Indicador)) {
    return NextResponse.json(
      { erro: `Indicador inválido. Use um de: ${INDICADORES_VALIDOS.join(", ")}.` },
      { status: 400 }
    );
  }
  const indicador = indicadorParam as Indicador;

  const historico = listarHistoricoPatrimonio(clienteId);
  if (historico.length < 2) {
    return NextResponse.json({ indicador, pontos: [] });
  }

  const dataInicial = historico[0].data;
  const dataFinal = historico[historico.length - 1].data;

  try {
    const serieIndicador = await buscarSerieIndicador(indicador, dataInicial, dataFinal);
    const pontos = historico
      .map((h) => ({
        data: h.data,
        valorCarteira: h.valor_total,
        valorIndicador: valorMaisProximo(serieIndicador, h.data),
      }))
      .filter((p) => p.valorIndicador != null) as {
      data: string;
      valorCarteira: number;
      valorIndicador: number;
    }[];

    return NextResponse.json({ indicador, pontos });
  } catch (erro) {
    console.error("Erro buscando série do indicador", indicador, erro);
    return NextResponse.json(
      { erro: "Não foi possível buscar os dados do indicador agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }
}
