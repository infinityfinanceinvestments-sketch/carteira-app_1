// Lê o extrato de custódia que o cliente baixa direto do Portal do
// Investidor da B3 (b3.com.br → Área do Investidor → "Extrato" → exportar em
// Excel) e converte pras posições que o resto do app já entende. O arquivo
// vem com uma aba por tipo de produto (Ações, BDR, ETF, Fundo de
// Investimento, Renda Fixa, Empréstimos, ...) — cada aba tem seu próprio
// cabeçalho, então lemos os nomes das colunas em vez de assumir a posição
// exata, pra não quebrar se a B3 mudar a ordem.
//
// Limitações importantes (documentadas pro consultor, não escondidas):
//  - A B3 não exporta o preço médio de compra original, só a cotação/valor
//    atual — por isso `preco_medio` é preenchido com o preço do dia da
//    exportação. A rentabilidade calculada pelo app vai refletir a variação
//    a partir de agora, não desde a compra real, até que o preço médio real
//    seja ajustado manualmente.
//  - BDRs e ações emprestadas (aba "Empréstimos") entram na classe "Ações".
//  - Na aba "Fundo de Investimento", só o que tem "imobiliário" no nome do
//    produto vira "FIIs" — o resto (ex: Fiagros) entra em "Fundos".
//  - Abas que não reconhecemos (ex: Opções, Termo, Tesouro Direto) são
//    ignoradas com um aviso, em vez de dar erro — o resto do arquivo importa
//    normalmente.

import ExcelJS from "exceljs";
import type { ClasseAtivo } from "@/lib/types";

export interface LinhaImportadaB3 {
  ativo: string;
  classe: ClasseAtivo;
  quantidade: number;
  preco_medio: number;
  valor_atual: number;
}

export interface ResultadoImportacaoB3 {
  linhas: LinhaImportadaB3[];
  avisos: string[];
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function paraNumero(valor: ExcelJS.CellValue): number | null {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const limpo = valor.replace(/\./g, "").replace(",", ".").trim();
    const n = Number(limpo);
    return Number.isFinite(n) ? n : Number(valor) || null;
  }
  return null;
}

function paraTexto(valor: ExcelJS.CellValue): string {
  if (valor == null) return "";
  if (typeof valor === "object" && "text" in (valor as { text?: string })) {
    return String((valor as { text?: string }).text ?? "").trim();
  }
  return String(valor).trim();
}

/** Extrai o ticker de um texto tipo "BBAS3 - BCO BRASIL S.A." → "BBAS3". */
function tickerDoProduto(produto: string): string {
  const [codigo] = produto.split(" - ");
  return (codigo || produto).trim();
}

/** Mapa "nome da coluna normalizado" -> índice (1-based, como o exceljs usa),
 *  lido a partir da linha de cabeçalho de uma aba. */
function mapearColunas(linhaCabecalho: ExcelJS.Row): Map<string, number> {
  const mapa = new Map<string, number>();
  linhaCabecalho.eachCell((celula, indice) => {
    const nome = normalizar(paraTexto(celula.value));
    if (nome) mapa.set(nome, indice);
  });
  return mapa;
}

type ClassificadorLinha = (produto: string) => ClasseAtivo;

// Como montar o "ativo" (nome/ticker) de cada linha:
//  - "codigo_negociacao": usa a coluna de ticker da própria aba (ex: "BBAS3"),
//    com fallback pro ticker extraído do texto de "Produto" se a coluna não existir.
//  - "produto_ticker": não tem coluna de ticker nessa aba — extrai o código
//    do começo do texto de "Produto" (ex: "BBAS3 - BCO BRASIL S.A." → "BBAS3").
//  - "produto_completo": usa o texto de "Produto" inteiro, sem cortar (ex:
//    títulos de Renda Fixa, onde o nome completo é mais legível que o código).
type OrigemAtivo = "codigo_negociacao" | "produto_ticker" | "produto_completo";

interface RegraAba {
  origemAtivo: OrigemAtivo;
  classificar: ClassificadorLinha;
  colunaValor: string[]; // tenta cada uma nessa ordem, usa a primeira com número válido
}

const REGRAS_POR_ABA: Record<string, RegraAba> = {
  acoes: {
    origemAtivo: "codigo_negociacao",
    classificar: () => "Ações",
    colunaValor: ["valor atualizado"],
  },
  bdr: {
    origemAtivo: "codigo_negociacao",
    classificar: () => "Ações",
    colunaValor: ["valor atualizado"],
  },
  emprestimos: {
    origemAtivo: "produto_ticker",
    classificar: () => "Ações",
    colunaValor: ["valor atualizado"],
  },
  etf: {
    origemAtivo: "codigo_negociacao",
    classificar: () => "ETFs",
    colunaValor: ["valor atualizado"],
  },
  "fundo de investimento": {
    origemAtivo: "codigo_negociacao",
    classificar: (produto) => (normalizar(produto).includes("imobili") ? "FIIs" : "Fundos"),
    colunaValor: ["valor atualizado"],
  },
  "renda fixa": {
    origemAtivo: "produto_completo",
    classificar: () => "Renda Fixa",
    colunaValor: ["valor atualizado mtm", "valor atualizado curva", "valor atualizado fechamento"],
  },
};

export async function parseExtratoB3(buffer: Buffer): Promise<ResultadoImportacaoB3> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const linhas: LinhaImportadaB3[] = [];
  const avisos: string[] = [];

  if (workbook.worksheets.length === 0) {
    return { linhas, avisos: ["Arquivo sem nenhuma aba."] };
  }

  for (const aba of workbook.worksheets) {
    const chaveAba = normalizar(aba.name);
    const regra = REGRAS_POR_ABA[chaveAba];
    if (!regra) {
      avisos.push(`Aba "${aba.name}" não reconhecida — ignorada.`);
      continue;
    }

    // Acha a linha de cabeçalho (a primeira com "Produto" numa célula).
    let linhaCabecalho: ExcelJS.Row | null = null;
    aba.eachRow((row) => {
      if (linhaCabecalho) return;
      let temProduto = false;
      row.eachCell((celula) => {
        if (normalizar(paraTexto(celula.value)) === "produto") temProduto = true;
      });
      if (temProduto) linhaCabecalho = row;
    });
    if (!linhaCabecalho) {
      avisos.push(`Aba "${aba.name}": não encontrei a linha de cabeçalho — ignorada.`);
      continue;
    }

    const colunas = mapearColunas(linhaCabecalho);
    const colProduto = colunas.get("produto");
    const colCodigo = colunas.get("codigo de negociacao");
    const colQuantidade = colunas.get("quantidade");
    if (!colProduto || !colQuantidade) {
      avisos.push(`Aba "${aba.name}": colunas essenciais não encontradas — ignorada.`);
      continue;
    }
    let colunaValorEncontrada: number | undefined;
    for (const nomeCol of regra.colunaValor) {
      const idx = colunas.get(nomeCol);
      if (idx) {
        colunaValorEncontrada = idx;
        break;
      }
    }

    let indiceLinha = (linhaCabecalho as ExcelJS.Row).number + 1;
    let linhasNaAba = 0;
    while (indiceLinha <= aba.rowCount) {
      const row = aba.getRow(indiceLinha);
      const produto = paraTexto(row.getCell(colProduto).value);
      if (!produto) break; // linha em branco = fim dos dados dessa aba

      const quantidade = paraNumero(row.getCell(colQuantidade).value);
      let valorAtual: number | null = null;
      for (const nomeCol of regra.colunaValor) {
        const idx = colunas.get(nomeCol);
        if (!idx) continue;
        const v = paraNumero(row.getCell(idx).value);
        if (v != null) {
          valorAtual = v;
          break;
        }
      }

      if (quantidade == null || valorAtual == null) {
        avisos.push(`Aba "${aba.name}", linha ${indiceLinha}: quantidade/valor não numérico — pulei essa linha.`);
        indiceLinha++;
        continue;
      }

      let ativo: string;
      if (regra.origemAtivo === "codigo_negociacao" && colCodigo) {
        ativo = paraTexto(row.getCell(colCodigo).value);
      } else if (regra.origemAtivo === "produto_completo") {
        ativo = produto;
      } else {
        ativo = tickerDoProduto(produto);
      }

      linhas.push({
        ativo: ativo || produto,
        classe: regra.classificar(produto),
        quantidade,
        preco_medio: quantidade !== 0 ? valorAtual / quantidade : 0,
        valor_atual: valorAtual,
      });
      linhasNaAba++;
      indiceLinha++;
    }

    if (linhasNaAba === 0) {
      avisos.push(`Aba "${aba.name}": nenhuma posição encontrada.`);
    }
    if (!colunaValorEncontrada) {
      avisos.push(`Aba "${aba.name}": não encontrei a coluna de valor esperada — confira o resultado.`);
    }
  }

  return { linhas, avisos };
}
