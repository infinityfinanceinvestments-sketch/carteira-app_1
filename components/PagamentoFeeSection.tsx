"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Vira "10" -> "" (pra digitar valor decimal com vírgula, mesmo padrão de
 *  InformarMovimentacao.tsx) — aceita tanto vírgula quanto ponto. */
function paraNumero(v: string): number | null {
  const limpo = v.trim().replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Seção "Pagamento" do perfil do cliente (lado consultor) — forma de
 *  pagamento é sempre fee based por enquanto (só exibido como rótulo fixo),
 *  o consultor define o valor do fee (fica "a definir" até ser preenchido)
 *  e o dia do mês em que o cliente costuma pagar, e marca se o fee do mês
 *  ATUAL já foi pago (badge verde) ou não (badge vermelho). */
export default function PagamentoFeeSection({
  clienteId,
  valorFeeInicial,
  diaVencimentoInicial,
  pagoNoMes,
  mesReferenciaLabel,
}: {
  clienteId: number;
  valorFeeInicial: number | null;
  diaVencimentoInicial: number | null;
  pagoNoMes: boolean;
  /** Ex: "setembro/2026" — só pra exibir, já formatado pelo servidor. */
  mesReferenciaLabel: string;
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [marcandoPagamento, setMarcandoPagamento] = useState(false);
  const [valorFee, setValorFee] = useState(
    valorFeeInicial != null ? String(valorFeeInicial).replace(".", ",") : ""
  );
  const [diaVencimento, setDiaVencimento] = useState(
    diaVencimentoInicial != null ? String(diaVencimentoInicial) : ""
  );
  const [erro, setErro] = useState<string | null>(null);

  function cancelar() {
    setValorFee(valorFeeInicial != null ? String(valorFeeInicial).replace(".", ",") : "");
    setDiaVencimento(diaVencimentoInicial != null ? String(diaVencimentoInicial) : "");
    setErro(null);
    setEditando(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const valor = paraNumero(valorFee);
    if (valorFee.trim() && (valor == null || valor <= 0)) {
      setErro("Informe um valor de fee válido (ou deixe em branco pra \"a definir\").");
      return;
    }
    const dia = diaVencimento.trim() ? Number(diaVencimento) : null;
    if (dia != null && (!Number.isInteger(dia) || dia < 1 || dia > 31)) {
      setErro("O dia de vencimento precisa ser um número entre 1 e 31.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/fee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor_fee: valor, dia_vencimento_fee: dia }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível salvar.");
        return;
      }
      mostrarToast("Configuração de pagamento atualizada!");
      setEditando(false);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarPagamento() {
    setMarcandoPagamento(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/pagamento-fee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pago: !pagoNoMes }),
      });
      if (!res.ok) {
        mostrarToast("Não foi possível atualizar o pagamento.", "erro");
        return;
      }
      mostrarToast(
        !pagoNoMes ? "Pagamento do mês marcado como PAGO." : "Pagamento do mês reaberto."
      );
      router.refresh();
    } catch {
      mostrarToast("Erro de conexão. Tente novamente.", "erro");
    } finally {
      setMarcandoPagamento(false);
    }
  }

  return (
    <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pagamento</h2>
        {!editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Editar
          </button>
        )}
      </div>

      {!editando ? (
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Forma de pagamento</dt>
            <dd className="text-slate-800 dark:text-slate-100">Fee based</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Valor do fee</dt>
            <dd className="text-slate-800 dark:text-slate-100">
              {valorFeeInicial != null ? (
                formatBRL(valorFeeInicial)
              ) : (
                <span className="text-slate-400 dark:text-slate-500">A definir</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Dia de vencimento</dt>
            <dd className="text-slate-800 dark:text-slate-100">
              {diaVencimentoInicial != null ? (
                `Dia ${diaVencimentoInicial}`
              ) : (
                <span className="text-slate-400 dark:text-slate-500">Não definido</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">{mesReferenciaLabel}</dt>
            <dd className="mt-0.5">
              <button
                type="button"
                onClick={alternarPagamento}
                disabled={marcandoPagamento}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                  pagoNoMes
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}
                title="Clique pra alternar o status desse mês"
              >
                {pagoNoMes ? "PAGO" : "NÃO PAGO"}
              </button>
            </dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={salvar} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Forma de pagamento
            </span>
            <input value="Fee based" disabled className={`${inputClass} opacity-60`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Valor do fee (R$) — deixe em branco pra &ldquo;a definir&rdquo;
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 500,00"
              value={valorFee}
              onChange={(e) => setValorFee(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Dia do mês em que o cliente paga
            </span>
            <input
              type="number"
              min={1}
              max={31}
              placeholder="Ex: 10"
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
              className={inputClass}
            />
          </label>

          {erro && (
            <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {erro}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl btn-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={cancelar}
              disabled={salvando}
              className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
