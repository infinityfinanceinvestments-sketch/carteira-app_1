import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  getOuCriarContaManual,
  inserirPosicao,
  listarPosicoesDaConta,
  registrarAuditoria,
  valorTotalCarteira,
  substituirPontoHistoricoDoDia,
} from "@/lib/repo";
import { CLASSES_ATIVO } from "@/lib/types";

const schema = z.object({
  instituicao: z.string().min(1),
  csv: z.string().min(1),
});

interface LinhaImportada {
  ativo: string;
  classe: string;
  quantidade: number;
  preco_medio: number;
  valor_atual: number;
}

function parseCsv(csv: string): { linhas: LinhaImportada[]; erros: string[] } {
  const linhas: LinhaImportada[] = [];
  const erros: string[] = [];
  const registros = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (registros.length === 0) return { linhas, erros: ["Arquivo vazio."] };

  const primeira = registros[0].toLowerCase();
  const temCabecalho = primeira.startsWith("ativo");
  const dados = temCabecalho ? registros.slice(1) : registros;

  dados.forEach((linha, idx) => {
    const numeroLinha = idx + (temCabecalho ? 2 : 1);
    const partes = linha.split(",").map((p) => p.trim());
    if (partes.length < 5) {
      erros.push(
        `Linha ${numeroLinha}: esperado "ativo,classe,quantidade,preco_medio,valor_atual".`
      );
      return;
    }
    const [ativo, classe, quantidadeStr, precoMedioStr, valorAtualStr] = partes;
    const quantidade = Number(quantidadeStr.replace(",", "."));
    const precoMedio = Number(precoMedioStr.replace(",", "."));
    const valorAtual = Number(valorAtualStr.replace(",", "."));

    if (!ativo) {
      erros.push(`Linha ${numeroLinha}: ativo em branco.`);
      return;
    }
    if (!(CLASSES_ATIVO as readonly string[]).includes(classe)) {
      erros.push(
        `Linha ${numeroLinha}: classe "${classe}" inválida. Use uma de: ${CLASSES_ATIVO.join(", ")}.`
      );
      return;
    }
    if ([quantidade, precoMedio, valorAtual].some((n) => Number.isNaN(n))) {
      erros.push(`Linha ${numeroLinha}: quantidade/preço/valor numérico inválido.`);
      return;
    }

    linhas.push({ ativo, classe, quantidade, preco_medio: precoMedio, valor_atual: valorAtual });
  });

  return { linhas, erros };
}

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
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const { linhas, erros } = parseCsv(parsed.data.csv);
  if (linhas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma posição válida encontrada.", erros },
      { status: 400 }
    );
  }

  const contaId = getOuCriarContaManual(clienteId, parsed.data.instituicao);
  const posicoesAntes = listarPosicoesDaConta(contaId);
  const valorAntes = posicoesAntes.reduce((acc, p) => acc + p.valor_atual, 0);
  for (const linha of linhas) {
    inserirPosicao({ conta_id: contaId, ...linha });
  }

  const novoTotal = valorTotalCarteira(clienteId);
  substituirPontoHistoricoDoDia(
    clienteId,
    new Date().toISOString().slice(0, 10),
    novoTotal
  );

  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "importacao_manual",
    detalhes: {
      instituicao: parsed.data.instituicao,
      posicoesAntes: posicoesAntes.length,
      posicoesAdicionadas: linhas.length,
      valorAntes,
      valorAdicionado: linhas.reduce((acc, l) => acc + l.valor_atual, 0),
    },
  });

  return NextResponse.json({
    ok: true,
    importadas: linhas.length,
    erros,
  });
}
