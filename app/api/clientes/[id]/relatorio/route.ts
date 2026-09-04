import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { getClientePorId } from "@/lib/repo";
import { gerarRelatorioClientePdf } from "@/lib/relatorio";

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

  try {
    const pdfBytes = await gerarRelatorioClientePdf(clienteId);
    const nomeArquivo = `relatorio-${cliente.nome.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      },
    });
  } catch (erro) {
    console.error("Erro gerando relatório em PDF", erro);
    return NextResponse.json(
      { erro: "Não foi possível gerar o relatório agora." },
      { status: 500 }
    );
  }
}
