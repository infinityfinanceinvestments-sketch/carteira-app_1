import getDb, { plainRows } from "../db";

/** Ponto "cru" de um indicador — o valor como veio da fonte (taxa diária do
 *  CDI em %, variação mensal do IPCA em %, fechamento do IBOV/S&P 500 em
 *  pontos/dólares) — nunca o índice acumulado base-100, que depende da data
 *  inicial escolhida em cada consulta e por isso não pode ser cacheado do
 *  jeito "pronto". */
export interface PontoIndicadorBruto {
  data: string; // yyyy-MM-dd
  valor_bruto: number;
}

/** Lê os pontos já persistidos de um indicador num intervalo — 0 chamadas
 *  de rede quando o intervalo já foi buscado antes (o valor de um dia já
 *  publicado nunca muda). */
export function lerValoresBrutosPersistidos(
  indicador: string,
  dataInicial: string,
  dataFinal: string
): PontoIndicadorBruto[] {
  const db = getDb();
  return plainRows(
    db
      .prepare(
        `SELECT data, valor_bruto FROM indices_valores_brutos
         WHERE indicador = ? AND data >= ? AND data <= ?
         ORDER BY data ASC`
      )
      .all(indicador, dataInicial, dataFinal) as unknown as PontoIndicadorBruto[]
  );
}

/** Datas (yyyy-MM-dd) mínima e máxima já persistidas pra um indicador, ou
 *  null se nunca foi buscado. Usado pra decidir se um intervalo pedido já
 *  está totalmente coberto pelo que já temos guardado. */
export function limitesPersistidos(
  indicador: string
): { min: string; max: string } | null {
  const db = getDb();
  const linha = db
    .prepare(
      `SELECT MIN(data) AS min, MAX(data) AS max FROM indices_valores_brutos WHERE indicador = ?`
    )
    .get(indicador) as { min: string | null; max: string | null } | undefined;
  if (!linha?.min || !linha?.max) return null;
  return { min: linha.min, max: linha.max };
}

/** Grava (ou substitui, se já existir a mesma data) um lote de pontos crus
 *  — idempotente, então pode ser chamado com pontos que já existem sem
 *  duplicar nem falhar. */
export function salvarValoresBrutos(indicador: string, pontos: PontoIndicadorBruto[]): void {
  if (pontos.length === 0) return;
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO indices_valores_brutos (indicador, data, valor_bruto)
     VALUES (?, ?, ?)
     ON CONFLICT (indicador, data) DO UPDATE SET valor_bruto = excluded.valor_bruto`
  );
  db.exec("BEGIN");
  try {
    for (const p of pontos) {
      stmt.run(indicador, p.data, p.valor_bruto);
    }
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}
