// Helpers de formatação compartilhados entre páginas/components do web.

/** O SQLite grava `datetime('now')` como "YYYY-MM-DD HH:MM:SS" em UTC, sem
 *  indicar fuso — o `Date` do JS trata isso como horário local se não
 *  virar ISO com "T"/"Z" primeiro. */
export function formatDataHoraBr(sqliteDatetime: string): string {
  const iso = sqliteDatetime.includes("T") ? sqliteDatetime : sqliteDatetime.replace(" ", "T") + "Z";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return sqliteDatetime;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
