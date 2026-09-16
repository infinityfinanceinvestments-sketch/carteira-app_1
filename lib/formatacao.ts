// Helpers de formatação compartilhados entre páginas/components do web.

/** O SQLite grava `datetime('now')` como "YYYY-MM-DD HH:MM:SS" em UTC, sem
 *  indicar fuso — o `Date` do JS trata isso como horário local se não
 *  virar ISO com "T"/"Z" primeiro. */
export function sqliteDatetimeParaDate(sqliteDatetime: string): Date {
  const iso = sqliteDatetime.includes("T") ? sqliteDatetime : sqliteDatetime.replace(" ", "T") + "Z";
  return new Date(iso);
}

export function formatDataHoraBr(sqliteDatetime: string): string {
  const data = sqliteDatetimeParaDate(sqliteDatetime);
  if (Number.isNaN(data.getTime())) return sqliteDatetime;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Só a hora:minuto (ex: "14:23") — usado no eixo do gráfico intraday. */
export function formatHoraBr(sqliteDatetime: string): string {
  const data = sqliteDatetimeParaDate(sqliteDatetime);
  if (Number.isNaN(data.getTime())) return sqliteDatetime;
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
