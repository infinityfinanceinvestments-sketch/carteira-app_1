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
import { parseExtratoAvenue } from "@/lib/importarAvenue";

// Nome fixo da "conta" onde as posições importadas do extrato da Avenue
// ficam guardadas — sempre o mesmo pra um cliente, então reimportar (ex:
// extrato do mês seguinte) substitui as posições antigas em vez de duplicar.
const INSTITUICAO_AVENUE = "Avenue";

const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10MB — o extrato mensal é leve, isso já é uma folga generosa

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
  if (!arquivo.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { erro: "Formato inválido — envie o extrato mensal (\"Account Statement\") em PDF baixado da Avenue." },
      { status: 400 }
    );
  }

  let resultado: Awaited<ReturnType<typeof parseExtratoAvenue>>;
  try {
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    resultado = await parseExtratoAvenue(buffer);
  } catch (erro) {
    console.error("Erro lendo extrato Avenue", erro);
    return NextResponse.json(
      { erro: "Não consegui ler esse PDF. Confira se é o extrato mensal exportado da Avenue." },
      { status: 400 }
    );
  }

  if (resultado.linhas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma posição reconhecida nesse arquivo.", avisos: resultado.avisos },
      { status: 400 }
    );
  }

  const contaId = getOuCriarContaManual(clienteId, INSTITUICAO_AVENUE);
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
    acao: "importacao_avenue",
    detalhes: {
      instituicao: INSTITUICAO_AVENUE,
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
