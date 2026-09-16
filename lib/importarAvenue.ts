// Lê o extrato mensal ("Account Statement") em PDF que a Avenue manda/
// disponibiliza pra download e converte pras posições que o resto do app já
// entende. Diferente do extrato da B3 (planilha .xlsx com colunas nomeadas),
// esse é um PDF de texto corrido — por isso o parser trabalha em duas
// etapas: `parseExtratoAvenue` extrai o texto bruto do PDF (via pdf-parse) e
// `parseTextoAvenue` (pura, testável sem precisar de um PDF de verdade) acha
// as linhas da tabela "PORTFOLIO SUMMARY".
//
// Como o texto extraído de um PDF não preserva colunas de forma confiável —
// o nome do ativo pode vir na mesma linha dos números ou quebrado em linhas
// anteriores, dependendo do quanto ele é comprido — a estratégia é achar,
// em cada linha, um campo curto e todo maiúsculo (o "tipo de conta", sempre
// "C" nos extratos vistos até agora) que é seguido por três campos
// numéricos (quantidade, preço, valor de mercado). O campo imediatamente
// antes dele é o ticker do ativo. Isso funciona não importa quantos campos
// de descrição vierem antes.
//
// Limitações importantes (documentadas pro consultor, não escondidas):
//  - Assim como no extrato da B3, esse PDF não traz o preço médio de compra
//    original — só a cotação atual. `preco_medio` é preenchido com o preço
//    do dia do extrato, e a rentabilidade calculada pelo app só vai refletir
//    a variação a partir de agora, até o preço médio real ser ajustado.
//  - A classe do ativo é um palpite: só vira "ETFs" quando a palavra "ETF"
//    aparece perto do ticker no PDF; o resto entra como "Ações" (o consultor
//    pode reimportar depois de editar manualmente, se precisar corrigir).
//  - Só a seção "PORTFOLIO SUMMARY" (posições atuais) é lida — o histórico
//    de transações e dividendos do mesmo extrato é ignorado de propósito.

import { PDFParse } from "pdf-parse";
import type { ClasseAtivo } from "@/lib/types";

export interface LinhaImportadaAvenue {
  ativo: string;
  classe: ClasseAtivo;
  quantidade: number;
  preco_medio: number;
  valor_atual: number;
}

export interface ResultadoImportacaoAvenue {
  linhas: LinhaImportadaAvenue[];
  avisos: string[];
}

const MARCADOR_INICIO = "portfolio summary";
const MARCADOR_FIM = "account activity";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Números no extrato da Avenue vêm no formato americano (vírgula separa
 *  milhar, ponto separa decimal) — o oposto do formato brasileiro usado no
 *  extrato da B3. */
function paraNumeroUS(texto: string | undefined): number | null {
  if (!texto) return null;
  const limpo = texto.replace(/\$/g, "").replace(/,/g, "").trim();
  if (!limpo || limpo.toUpperCase() === "N/A") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

interface LinhaDePosicaoAchada {
  indiceSimbolo: number;
  indiceTipoConta: number;
}

function acharLinhaDePosicao(campos: string[]): LinhaDePosicaoAchada | null {
  for (let i = 1; i <= campos.length - 4; i++) {
    if (!/^[A-Z]{1,3}$/.test(campos[i])) continue;
    if (paraNumeroUS(campos[i + 1]) == null) continue;
    if (paraNumeroUS(campos[i + 2]) == null) continue;
    if (paraNumeroUS(campos[i + 3]) == null) continue;
    return { indiceSimbolo: i - 1, indiceTipoConta: i };
  }
  return null;
}

function classificar(contexto: string): ClasseAtivo {
  return normalizar(contexto).includes("etf") ? "ETFs" : "Ações";
}

export function parseTextoAvenue(texto: string): ResultadoImportacaoAvenue {
  const linhas: LinhaImportadaAvenue[] = [];
  const avisos: string[] = [];

  let dentroDoResumo = false;
  let linhaAnterior = "";

  for (const linhaBruta of texto.split("\n")) {
    const linha = linhaBruta.trim();
    const linhaNormalizada = normalizar(linha);

    if (linhaNormalizada.startsWith(MARCADOR_INICIO)) {
      dentroDoResumo = true;
      linhaAnterior = "";
      continue;
    }
    if (linhaNormalizada.startsWith(MARCADOR_FIM)) {
      dentroDoResumo = false;
      continue;
    }
    if (!dentroDoResumo || !linha) {
      if (linha) linhaAnterior = linha;
      continue;
    }

    const campos = linha.split("\t").map((c) => c.trim());
    const achado = acharLinhaDePosicao(campos);
    if (!achado) {
      linhaAnterior = linha;
      continue;
    }

    const { indiceSimbolo, indiceTipoConta } = achado;
    const simbolo = campos[indiceSimbolo];
    const quantidade = paraNumeroUS(campos[indiceTipoConta + 1]);
    const preco = paraNumeroUS(campos[indiceTipoConta + 2]);
    const valorMercado = paraNumeroUS(campos[indiceTipoConta + 3]);

    if (!simbolo || quantidade == null || preco == null || valorMercado == null) {
      avisos.push(`Linha não reconhecida no extrato: "${linha}"`);
      linhaAnterior = linha;
      continue;
    }

    // Só usa a linha anterior pro contexto quando essa própria linha não tem
    // descrição embutida (nome do ativo comprido, que quebrou pra linhas de
    // cima) — senão a descrição da posição ANTERIOR vaza pra classificação
    // desta (ex: um ETF antes de uma ação faria a ação virar "ETFs" à toa).
    const descricaoNaLinha = campos.slice(0, indiceSimbolo).join(" ");
    const contexto =
      descricaoNaLinha.length > 0
        ? `${descricaoNaLinha} ${simbolo}`
        : `${linhaAnterior} ${simbolo}`;

    linhas.push({
      ativo: simbolo,
      classe: classificar(contexto),
      quantidade,
      preco_medio: preco,
      valor_atual: valorMercado,
    });
    linhaAnterior = linha;
  }

  if (linhas.length === 0) {
    avisos.push(
      'Nenhuma posição reconhecida — confira se é o extrato mensal ("Account Statement") em PDF baixado da Avenue.'
    );
  }

  return { linhas, avisos };
}

export async function parseExtratoAvenue(buffer: Buffer): Promise<ResultadoImportacaoAvenue> {
  const parser = new PDFParse({ data: buffer });
  try {
    const resultado = await parser.getText();
    return parseTextoAvenue(resultado.text);
  } finally {
    await parser.destroy();
  }
}
