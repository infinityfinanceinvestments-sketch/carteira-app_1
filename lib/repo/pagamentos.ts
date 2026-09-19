import getDb, { plainRow } from "../db";
import type { PagamentoFee } from "../types";

/** Mês de referência no formato 'YYYY-MM' usado por pagamentos_fee — sempre
 *  o mês corrente na hora da chamada (não recebe data arbitrária: o
 *  controle de pagamento só faz sentido "esse mês", passado não se marca
 *  retroativamente por aqui). */
export function mesReferenciaAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Status de pagamento do cliente num mês — undefined (tratado como "não
 *  pago") quando nunca foi marcado nesse mês. */
export function getStatusPagamento(
  clienteId: number,
  mesReferencia: string
): PagamentoFee | undefined {
  const db = getDb();
  return plainRow(
    db
      .prepare(`SELECT * FROM pagamentos_fee WHERE cliente_id = ? AND mes_referencia = ?`)
      .get(clienteId, mesReferencia) as PagamentoFee | undefined
  );
}

/** Marca (ou desmarca, se o consultor reabrir por engano) o pagamento do
 *  fee num mês — upsert por (cliente_id, mes_referencia): cada mês só tem
 *  uma linha, que é criada na primeira marcação e atualizada depois disso. */
export function marcarPagamento(
  clienteId: number,
  mesReferencia: string,
  pago: boolean
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO pagamentos_fee (cliente_id, mes_referencia, pago, pago_em)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (cliente_id, mes_referencia)
     DO UPDATE SET pago = excluded.pago, pago_em = excluded.pago_em`
  ).run(clienteId, mesReferencia, pago ? 1 : 0, pago ? new Date().toISOString() : null);
}
