// Registra um ponto intraday do patrimônio total do cliente sempre que a
// carteira é aberta — alimenta o filtro "1D" do gráfico de evolução (ver
// components/EvolutionChart.tsx) com uma visão dentro do próprio dia, sem
// precisar de nenhum job agendado rodando sozinho (mesmo espírito de "lazy
// update on access" do resto do app: cotações, renda fixa indexada, e o
// snapshot diário do histórico também só atualizam quando alguém abre a
// carteira). Por causa disso, os pontos ficam exatamente nos horários em
// que a carteira foi aberta — não é uma amostragem em intervalo fixo como
// um gráfico de corretora de verdade: se ninguém abrir a carteira às 14h,
// não vai ter ponto às 14h.
//
// Throttle: só grava um ponto novo se o último de hoje for de pelo menos
// THROTTLE_MINUTOS atrás (ou não existir nenhum ainda) — evita lotar a
// tabela se o cliente ficar dando refresh na página repetidamente.

import { registrarPontoIntraday, ultimoMomentoIntraday, limparIntradayAntigo } from "@/lib/repo";
import { sqliteDatetimeParaDate } from "@/lib/formatacao";

const THROTTLE_MINUTOS = 5;

/** Pura — decide se já passou tempo suficiente desde o último ponto
 *  registrado pra valer a pena gravar um novo. Testável isolada do banco. */
export function precisaRegistrarPontoIntraday(
  ultimoMomentoSqlite: string | null,
  agora: Date,
  throttleMinutos: number
): boolean {
  if (ultimoMomentoSqlite == null) return true;
  const minutosDesdeUltimo =
    (agora.getTime() - sqliteDatetimeParaDate(ultimoMomentoSqlite).getTime()) / 60000;
  return minutosDesdeUltimo >= throttleMinutos;
}

/** Nunca lança exceção — "best effort", mesmo espírito de
 *  atualizarRendaFixaIndexada/atualizarPrecosDeMercado: se algo der errado
 *  aqui, a carteira continua carregando normal, só sem o ponto de hoje. */
export function registrarSnapshotIntraday(clienteId: number, valorTotal: number): void {
  try {
    const ultimo = ultimoMomentoIntraday(clienteId);
    if (!precisaRegistrarPontoIntraday(ultimo, new Date(), THROTTLE_MINUTOS)) return;
    registrarPontoIntraday(clienteId, valorTotal);
    limparIntradayAntigo();
  } catch (erro) {
    console.error("Erro registrando ponto intraday", erro);
  }
}
