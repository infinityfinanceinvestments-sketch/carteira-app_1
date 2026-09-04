import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { gerarRelatorioConsolidadoPdf } from "@/lib/relatorio";

// Exporta a carteira inteira (todos os clientes) num único PDF — só o
// consultor tem essa visão geral, um cliente nunca deveria ver a carteira
// dos outros.
export async function GET(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  if (sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }

  try {
    const pdfBytes = await gerarRelatorioConsolidadoPdf();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carteira-consolidada.pdf"`,
      },
    });
  } catch (erro) {
    console.error("Erro gerando relatório consolidado em PDF", erro);
    return NextResponse.json(
      { erro: "Não foi possível gerar o relatório agora." },
      { status: 500 }
    );
  }
}
