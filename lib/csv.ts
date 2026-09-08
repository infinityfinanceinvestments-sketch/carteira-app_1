// Geração de CSV pra exportação de posições e proventos (web).
//
// Usa ";" como separador (não ","), porque é isso que o Excel em
// português abre corretamente sem precisar de "Dados > Texto para
// colunas" — o Excel BR usa vírgula como separador decimal, então usar
// vírgula como separador de campo quebraria qualquer coluna numérica.
// Por consistência, os números aqui também saem com vírgula decimal
// (toLocaleString("pt-BR")), do mesmo jeito que já aparecem na tela.
import type { Posicao, Provento } from "./types";

const ROTULO_TIPO_PROVENTO: Record<Provento["tipo"], string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento: "Rendimento",
};

function escaparCampoCsv(valor: string): string {
  if (/[";\n\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

function linhaCsv(campos: (string | number)[]): string {
  return campos.map((c) => escaparCampoCsv(String(c))).join(";");
}

/** SQLite grava datas de posição como "YYYY-MM-DD HH:MM:SS" (datetime) e
 *  datas de provento como "YYYY-MM-DD" (date) — ambos sem indicar fuso.
 *  Só reformata a parte de data (DD/MM/AAAA), igual ao resto da tela. */
function formatDataBr(isoOuSqlite: string): string {
  const dataParte = isoOuSqlite.slice(0, 10);
  const [ano, mes, dia] = dataParte.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : isoOuSqlite;
}

const numeroBr = (v: number, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Excel só reconhece acentuação em UTF-8 se o arquivo começar com o BOM.
const BOM = "﻿";

function montarCsv(cabecalho: string[], linhas: string[][]): string {
  const todasLinhas = [cabecalho, ...linhas].map(linhaCsv);
  return BOM + todasLinhas.join("\r\n") + "\r\n";
}

export function posicoesParaCsv(posicoes: Posicao[]): string {
  const linhas = posicoes.map((p) => [
    p.ativo,
    p.classe,
    numeroBr(p.quantidade, p.quantidade % 1 === 0 ? 0 : 2),
    numeroBr(p.preco_medio),
    numeroBr(p.valor_atual),
    formatDataBr(p.atualizado_em),
  ]);
  return montarCsv(
    ["Ativo", "Classe", "Quantidade", "Preço médio", "Valor atual", "Atualizado em"],
    linhas
  );
}

export function proventosParaCsv(proventos: Provento[]): string {
  const linhas = proventos.map((p) => [
    p.ativo,
    ROTULO_TIPO_PROVENTO[p.tipo] ?? p.tipo,
    numeroBr(p.valor),
    formatDataBr(p.data_pagamento),
  ]);
  return montarCsv(["Ativo", "Tipo", "Valor", "Data de pagamento"], linhas);
}
