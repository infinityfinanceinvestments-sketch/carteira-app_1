// Gera um PDF simples com o retrato da carteira de um cliente — pra ele (ou
// o consultor) poder baixar e guardar/mandar pro contador. Usa pdf-lib (sem
// dependências nativas, roda bem num route handler do Next.js).

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  getClientePorId,
  listarPosicoesDoCliente,
  consolidarPosicoes,
  alocacaoPorClasse,
  valorTotalCarteira,
  totalProventosDoCliente,
  listarClientes,
} from "./repo";

const AZUL_NAVY = rgb(0.11, 0.25, 0.43); // #1c3f6e, mesma cor usada no gráfico web
const CINZA = rgb(0.4, 0.45, 0.53);
const CINZA_CLARO = rgb(0.88, 0.9, 0.94);

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDataHora = (d: Date) =>
  d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const MARGEM = 48;
const LARGURA_PAGINA = 595.28; // A4
const ALTURA_PAGINA = 841.89;

interface Cursor {
  page: PDFPage;
  y: number;
}

function novaPagina(doc: PDFDocument): Cursor {
  const page = doc.addPage([LARGURA_PAGINA, ALTURA_PAGINA]);
  return { page, y: ALTURA_PAGINA - MARGEM };
}

function garantirEspaco(doc: PDFDocument, cursor: Cursor, alturaNecessaria: number): Cursor {
  if (cursor.y - alturaNecessaria < MARGEM) {
    return novaPagina(doc);
  }
  return cursor;
}

function escreverTexto(
  cursor: Cursor,
  texto: string,
  opts: { font: PDFFont; tamanho: number; cor?: ReturnType<typeof rgb>; x?: number }
) {
  cursor.page.drawText(texto, {
    x: opts.x ?? MARGEM,
    y: cursor.y,
    size: opts.tamanho,
    font: opts.font,
    color: opts.cor ?? rgb(0.05, 0.08, 0.15),
  });
}

/** Gera o PDF do relatório de carteira de um cliente. Retorna os bytes
 *  prontos pra devolver como resposta HTTP (application/pdf). */
export async function gerarRelatorioClientePdf(clienteId: number): Promise<Uint8Array> {
  const cliente = getClientePorId(clienteId);
  if (!cliente) throw new Error("Cliente não encontrado.");

  const posicoes = consolidarPosicoes(listarPosicoesDoCliente(clienteId));
  const alocacao = alocacaoPorClasse(clienteId);
  const total = valorTotalCarteira(clienteId);
  const totalProventos = totalProventosDoCliente(clienteId);

  const doc = await PDFDocument.create();
  const fonteRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await doc.embedFont(StandardFonts.HelveticaBold);

  let cursor = novaPagina(doc);

  // Cabeçalho
  escreverTexto(cursor, "INFINITY TRADING", { font: fonteNegrito, tamanho: 18, cor: AZUL_NAVY });
  cursor.y -= 22;
  escreverTexto(cursor, "Relatório de carteira", { font: fonteRegular, tamanho: 12, cor: CINZA });
  cursor.y -= 16;
  escreverTexto(cursor, `Gerado em ${formatDataHora(new Date())}`, {
    font: fonteRegular,
    tamanho: 9,
    cor: CINZA,
  });
  cursor.y -= 28;

  cursor.page.drawLine({
    start: { x: MARGEM, y: cursor.y },
    end: { x: LARGURA_PAGINA - MARGEM, y: cursor.y },
    thickness: 1,
    color: CINZA_CLARO,
  });
  cursor.y -= 24;

  // Dados do cliente
  escreverTexto(cursor, cliente.nome, { font: fonteNegrito, tamanho: 14 });
  cursor.y -= 18;
  escreverTexto(
    cursor,
    `Perfil de risco: ${cliente.perfil_risco}   |   Benchmark: ${cliente.benchmark}`,
    { font: fonteRegular, tamanho: 10, cor: CINZA }
  );
  cursor.y -= 30;

  // Patrimônio total
  escreverTexto(cursor, "PATRIMÔNIO TOTAL", { font: fonteRegular, tamanho: 9, cor: CINZA });
  cursor.y -= 20;
  escreverTexto(cursor, formatBRL(total), { font: fonteNegrito, tamanho: 22, cor: AZUL_NAVY });
  cursor.y -= 34;

  // Alocação por classe
  if (alocacao.length > 0) {
    escreverTexto(cursor, "Alocação por classe de ativo", { font: fonteNegrito, tamanho: 11 });
    cursor.y -= 18;
    for (const a of alocacao) {
      cursor = garantirEspaco(doc, cursor, 16);
      escreverTexto(cursor, a.classe, { font: fonteRegular, tamanho: 10 });
      escreverTexto(cursor, `${a.percentual.toFixed(1)}%`, {
        font: fonteRegular,
        tamanho: 10,
        x: LARGURA_PAGINA - MARGEM - 110,
      });
      escreverTexto(cursor, formatBRL(a.valor), {
        font: fonteRegular,
        tamanho: 10,
        x: LARGURA_PAGINA - MARGEM - 70,
      });
      cursor.y -= 16;
    }
    cursor.y -= 14;
  }

  // Posições
  cursor = garantirEspaco(doc, cursor, 60);
  escreverTexto(cursor, "Posições", { font: fonteNegrito, tamanho: 11 });
  cursor.y -= 18;

  const colunas = [
    { titulo: "Ativo", x: MARGEM, largura: 140 },
    { titulo: "Classe", x: MARGEM + 140, largura: 130 },
    { titulo: "Quantidade", x: MARGEM + 270, largura: 90 },
    { titulo: "Valor atual", x: MARGEM + 360, largura: 130 },
  ];
  for (const c of colunas) {
    escreverTexto(cursor, c.titulo, { font: fonteNegrito, tamanho: 9, cor: CINZA, x: c.x });
  }
  cursor.y -= 4;
  cursor.page.drawLine({
    start: { x: MARGEM, y: cursor.y },
    end: { x: LARGURA_PAGINA - MARGEM, y: cursor.y },
    thickness: 0.75,
    color: CINZA_CLARO,
  });
  cursor.y -= 14;

  if (posicoes.length === 0) {
    escreverTexto(cursor, "Nenhuma posição lançada ainda.", {
      font: fonteRegular,
      tamanho: 10,
      cor: CINZA,
    });
    cursor.y -= 16;
  } else {
    for (const p of posicoes) {
      cursor = garantirEspaco(doc, cursor, 18);
      escreverTexto(cursor, p.ativo, { font: fonteRegular, tamanho: 10, x: colunas[0].x });
      escreverTexto(cursor, p.classe, { font: fonteRegular, tamanho: 10, x: colunas[1].x });
      escreverTexto(cursor, p.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 }), {
        font: fonteRegular,
        tamanho: 10,
        x: colunas[2].x,
      });
      escreverTexto(cursor, formatBRL(p.valor_atual), {
        font: fonteRegular,
        tamanho: 10,
        x: colunas[3].x,
      });
      cursor.y -= 16;
    }
  }

  // Proventos
  cursor = garantirEspaco(doc, cursor, 50);
  cursor.y -= 10;
  escreverTexto(cursor, "Proventos recebidos (total acumulado)", {
    font: fonteNegrito,
    tamanho: 11,
  });
  cursor.y -= 18;
  escreverTexto(cursor, formatBRL(totalProventos), { font: fonteRegular, tamanho: 12 });
  cursor.y -= 30;

  // Rodapé / aviso regulatório na última página
  cursor = garantirEspaco(doc, cursor, 70);
  cursor.page.drawLine({
    start: { x: MARGEM, y: cursor.y },
    end: { x: LARGURA_PAGINA - MARGEM, y: cursor.y },
    thickness: 0.75,
    color: CINZA_CLARO,
  });
  cursor.y -= 18;
  const aviso =
    "As informações deste relatório têm caráter informativo e não constituem recomendação " +
    "personalizada de investimento. Investimentos em renda variável envolvem risco, inclusive " +
    "de perda do capital investido. Rentabilidade passada não representa garantia de rentabilidade futura.";
  const largura = LARGURA_PAGINA - MARGEM * 2;
  for (const linha of quebrarLinhas(aviso, fonteRegular, 8, largura)) {
    cursor = garantirEspaco(doc, cursor, 12);
    escreverTexto(cursor, linha, { font: fonteRegular, tamanho: 8, cor: CINZA });
    cursor.y -= 11;
  }

  return doc.save();
}

const PERFIL_LABEL: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

/** Gera o PDF consolidado com a carteira inteira — todos os clientes numa
 *  única lista, com patrimônio total sob gestão e a fatia de cada cliente.
 *  Pensado pro consultor exportar uma visão geral (ex: pra uma reunião ou
 *  pra guardar um retrato de um dia específico), sem precisar abrir
 *  relatório cliente por cliente. */
export async function gerarRelatorioConsolidadoPdf(): Promise<Uint8Array> {
  const clientes = listarClientes()
    .map((c) => ({
      ...c,
      valorTotal: valorTotalCarteira(c.id),
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);

  const totalGeral = clientes.reduce((soma, c) => soma + c.valorTotal, 0);

  const porPerfil = new Map<string, { quantidade: number; valor: number }>();
  for (const c of clientes) {
    const atual = porPerfil.get(c.perfil_risco) ?? { quantidade: 0, valor: 0 };
    atual.quantidade += 1;
    atual.valor += c.valorTotal;
    porPerfil.set(c.perfil_risco, atual);
  }

  const doc = await PDFDocument.create();
  const fonteRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await doc.embedFont(StandardFonts.HelveticaBold);

  let cursor = novaPagina(doc);

  // Cabeçalho
  escreverTexto(cursor, "INFINITY TRADING", { font: fonteNegrito, tamanho: 18, cor: AZUL_NAVY });
  cursor.y -= 22;
  escreverTexto(cursor, "Carteira consolidada — todos os clientes", {
    font: fonteRegular,
    tamanho: 12,
    cor: CINZA,
  });
  cursor.y -= 16;
  escreverTexto(cursor, `Gerado em ${formatDataHora(new Date())}`, {
    font: fonteRegular,
    tamanho: 9,
    cor: CINZA,
  });
  cursor.y -= 28;

  cursor.page.drawLine({
    start: { x: MARGEM, y: cursor.y },
    end: { x: LARGURA_PAGINA - MARGEM, y: cursor.y },
    thickness: 1,
    color: CINZA_CLARO,
  });
  cursor.y -= 24;

  // Patrimônio total sob gestão
  escreverTexto(cursor, "PATRIMÔNIO TOTAL SOB GESTÃO", { font: fonteRegular, tamanho: 9, cor: CINZA });
  cursor.y -= 20;
  escreverTexto(cursor, formatBRL(totalGeral), { font: fonteNegrito, tamanho: 22, cor: AZUL_NAVY });
  cursor.y -= 18;
  escreverTexto(cursor, `${clientes.length} cliente(s)`, { font: fonteRegular, tamanho: 10, cor: CINZA });
  cursor.y -= 30;

  // Distribuição por perfil de risco
  if (porPerfil.size > 0) {
    escreverTexto(cursor, "Distribuição por perfil de risco", { font: fonteNegrito, tamanho: 11 });
    cursor.y -= 18;
    for (const [perfil, dados] of porPerfil) {
      cursor = garantirEspaco(doc, cursor, 16);
      escreverTexto(cursor, PERFIL_LABEL[perfil] ?? perfil, { font: fonteRegular, tamanho: 10 });
      escreverTexto(cursor, `${dados.quantidade} cliente(s)`, {
        font: fonteRegular,
        tamanho: 10,
        x: LARGURA_PAGINA - MARGEM - 180,
      });
      escreverTexto(cursor, formatBRL(dados.valor), {
        font: fonteRegular,
        tamanho: 10,
        x: LARGURA_PAGINA - MARGEM - 100,
      });
      cursor.y -= 16;
    }
    cursor.y -= 14;
  }

  // Lista de clientes
  cursor = garantirEspaco(doc, cursor, 60);
  escreverTexto(cursor, "Clientes", { font: fonteNegrito, tamanho: 11 });
  cursor.y -= 18;

  const colunas = [
    { titulo: "Nome", x: MARGEM, largura: 190 },
    { titulo: "Perfil", x: MARGEM + 190, largura: 90 },
    { titulo: "Patrimônio", x: MARGEM + 300, largura: 110 },
    { titulo: "% da carteira", x: MARGEM + 410, largura: 90 },
  ];
  for (const c of colunas) {
    escreverTexto(cursor, c.titulo, { font: fonteNegrito, tamanho: 9, cor: CINZA, x: c.x });
  }
  cursor.y -= 4;
  cursor.page.drawLine({
    start: { x: MARGEM, y: cursor.y },
    end: { x: LARGURA_PAGINA - MARGEM, y: cursor.y },
    thickness: 0.75,
    color: CINZA_CLARO,
  });
  cursor.y -= 14;

  if (clientes.length === 0) {
    escreverTexto(cursor, "Nenhum cliente cadastrado ainda.", {
      font: fonteRegular,
      tamanho: 10,
      cor: CINZA,
    });
    cursor.y -= 16;
  } else {
    for (const c of clientes) {
      cursor = garantirEspaco(doc, cursor, 18);
      escreverTexto(cursor, c.nome, { font: fonteRegular, tamanho: 10, x: colunas[0].x });
      escreverTexto(cursor, PERFIL_LABEL[c.perfil_risco] ?? c.perfil_risco, {
        font: fonteRegular,
        tamanho: 10,
        x: colunas[1].x,
      });
      escreverTexto(cursor, formatBRL(c.valorTotal), { font: fonteRegular, tamanho: 10, x: colunas[2].x });
      escreverTexto(
        cursor,
        totalGeral > 0 ? `${((c.valorTotal / totalGeral) * 100).toFixed(1)}%` : "—",
        { font: fonteRegular, tamanho: 10, x: colunas[3].x }
      );
      cursor.y -= 16;
    }
  }

  // Rodapé / aviso regulatório na última página
  cursor = garantirEspaco(doc, cursor, 70);
  cursor.y -= 10;
  cursor.page.drawLine({
    start: { x: MARGEM, y: cursor.y },
    end: { x: LARGURA_PAGINA - MARGEM, y: cursor.y },
    thickness: 0.75,
    color: CINZA_CLARO,
  });
  cursor.y -= 18;
  const aviso =
    "As informações deste relatório têm caráter informativo e não constituem recomendação " +
    "personalizada de investimento. Investimentos em renda variável envolvem risco, inclusive " +
    "de perda do capital investido. Rentabilidade passada não representa garantia de rentabilidade futura.";
  const largura = LARGURA_PAGINA - MARGEM * 2;
  for (const linha of quebrarLinhas(aviso, fonteRegular, 8, largura)) {
    cursor = garantirEspaco(doc, cursor, 12);
    escreverTexto(cursor, linha, { font: fonteRegular, tamanho: 8, cor: CINZA });
    cursor.y -= 11;
  }

  return doc.save();
}

function quebrarLinhas(texto: string, font: PDFFont, tamanho: number, larguraMax: number): string[] {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let linhaAtual = "";
  for (const palavra of palavras) {
    const candidata = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (font.widthOfTextAtSize(candidata, tamanho) > larguraMax && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = candidata;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}
