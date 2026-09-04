import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  getOuCriarContaManual,
  listarPosicoesDaConta,
  registrarAuditoria,
  removerPosicoesDaConta,
  inserirPosicao,
  valorTotalCarteira,
  substituirPontoHistoricoDoDia,
} from "@/lib/repo";
import { parseExtratoB3 } from "@/lib/importarB3";

// Nome fixo da "conta" onde as posições importadas do extrato B3 ficam
// guardadas — sempre o mesmo pra um cliente, então reimportar (ex: extrato
// atualizado no mês seguinte) substitui as posições antigas em vez de
// duplicar.
const INSTITUICAO_B3 = "Portal do Investidor (B3)";

const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10MB — extrato B3 é leve, isso já é uma folga generosa

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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { erro: "Envie o arquivo como multipart/form-data (campo \"arquivo\")." },
      { status: 400 }
    );
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json({ erro: "Arquivo muito grande (máximo 10MB)." }, { status: 400 });
  }
  if (!arquivo.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { erro: "Formato inválido — envie o arquivo .xlsx exportado do Portal do Investidor da B3." },
      { status: 400 }
    );
  }

  let resultado: Awaited<ReturnType<typeof parseExtratoB3>>;
  try {
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    resultado = await parseExtratoB3(buffer);
  } catch (erro) {
    console.error("Erro lendo extrato B3", erro);
    return NextResponse.json(
      { erro: "Não consegui ler esse arquivo. Confira se é o .xlsx exportado direto do Portal do Investidor." },
      { status: 400 }
    );
  }

  if (resultado.linhas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma posição reconhecida nesse arquivo.", avisos: resultado.avisos },
      { status: 400 }
    );
  }

  const contaId = getOuCriarContaManual(clienteId, INSTITUICAO_B3);
  const posicoesAntes = listarPosicoesDaConta(contaId);
  const valorAntes = posicoesAntes.reduce((acc, p) => acc + p.valor_atual, 0);
  removerPosicoesDaConta(contaId);
  for (const linha of resultado.linhas) {
    inserirPosicao({ conta_id: contaId, ...linha });
  }

  const novoTotal = valorTotalCarteira(clienteId);
  substituirPontoHistoricoDoDia(clienteId, new Date().toISOString().slice(0, 10), novoTotal);

  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "importacao_b3",
    detalhes: {
      instituicao: INSTITUICAO_B3,
      posicoesAntes: posicoesAntes.length,
      posicoesDepois: resultado.linhas.length,
      valorAntes,
      valorDepois: resultado.linhas.reduce((acc, l) => acc + l.valor_atual, 0),
    },
  });

  return NextResponse.json({
    ok: true,
    importadas: resultado.linhas.length,
    avisos: resultado.avisos,
  });
}
