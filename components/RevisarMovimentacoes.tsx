"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

interface MovimentacaoPendenteResumo {
  id: number;
  tipo: "aporte" | "retirada";
  ativo: string;
  classe: string;
  quantidade: number | null;
  valor: number;
  observacao: string | null;
  criado_em: string;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 dark:border-white/10 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Fila de aportes/retiradas que o cliente informou, aguardando o
 *  consultor validar — aparece na página do cliente (só quando há algo
 *  pendente). O consultor pode ajustar valor/quantidade antes de aprovar
 *  (ex: cliente arredondou o valor) e deixar uma nota, que o cliente vê na
 *  notificação. Nada muda em `posicoes` até o clique em "Aprovar" (ver
 *  PATCH em app/api/clientes/[id]/movimentacoes/[movId]). */
export default function RevisarMovimentacoes({
  clienteId,
  movimentacoes,
}: {
  clienteId: number;
  movimentacoes: MovimentacaoPendenteResumo[];
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [quantidades, setQuantidades] = useState<Record<number, string>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [carregando, setCarregando] = useState<number | null>(null);

  if (movimentacoes.length === 0) return null;

  async function responder(m: MovimentacaoPendenteResumo, status: "aprovada" | "recusada") {
    setCarregando(m.id);
    try {
      const valorOverride = valores[m.id];
      const quantidadeOverride = quantidades[m.id];
      const res = await fetch(`/api/clientes/${clienteId}/movimentacoes/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          nota_consultor: notas[m.id]?.trim() || undefined,
          valor:
            status === "aprovada" && valorOverride
              ? Number(valorOverride.replace(",", "."))
              : undefined,
          quantidade:
            status === "aprovada" && quantidadeOverride
              ? Number(quantidadeOverride.replace(",", "."))
              : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        mostrarToast(data.erro ?? "Não foi possível atualizar — tente de novo.", "erro");
        return;
      }
      mostrarToast(
        status === "aprovada" ? "Movimentação aprovada!" : "Movimentação recusada.",
        "sucesso"
      );
      router.refresh();
    } catch {
      mostrarToast("Erro de conexão. Tente de novo.", "erro");
    } finally {
      setCarregando(null);
    }
  }

  return (
    <section className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-amber-200 dark:ring-amber-500/30">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          🔔 Aportes/retiradas aguardando validação
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">{movimentacoes.length}</span>
      </div>
      <ul className="space-y-2">
        {movimentacoes.map((m) => {
          const aberto = expandidoId === m.id;
          return (
            <li
              key={m.id}
              className="rounded-xl border border-slate-100 dark:border-white/5 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {m.tipo === "aporte" ? "Aporte" : "Retirada"} · {m.ativo}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatBRL(m.valor)}
                    {m.quantidade ? ` · ${m.quantidade} un.` : ""} ·{" "}
                    {new Date(m.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                  {m.observacao && (
                    <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                      &ldquo;{m.observacao}&rdquo;
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandidoId(aberto ? null : m.id)}
                  className="shrink-0 text-xs text-slate-400 dark:text-slate-500 underline"
                >
                  {aberto ? "Fechar" : "Ajustar"}
                </button>
              </div>

              {aberto && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Valor (R$) — deixe em branco pra manter {formatBRL(m.valor)}
                    </span>
                    <input
                      inputMode="decimal"
                      value={valores[m.id] ?? ""}
                      onChange={(e) => setValores((v) => ({ ...v, [m.id]: e.target.value }))}
                      placeholder={m.valor.toString()}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Quantidade — deixe em branco pra manter{" "}
                      {m.quantidade ?? "sem quantidade"}
                    </span>
                    <input
                      inputMode="decimal"
                      value={quantidades[m.id] ?? ""}
                      onChange={(e) =>
                        setQuantidades((v) => ({ ...v, [m.id]: e.target.value }))
                      }
                      placeholder={m.quantidade?.toString() ?? "—"}
                      className={inputClass}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Nota (opcional — o cliente vê na notificação)
                    </span>
                    <input
                      value={notas[m.id] ?? ""}
                      onChange={(e) => setNotas((v) => ({ ...v, [m.id]: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => responder(m, "aprovada")}
                  disabled={carregando !== null}
                  className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
                >
                  {carregando === m.id ? "..." : "Aprovar"}
                </button>
                <button
                  onClick={() => responder(m, "recusada")}
                  disabled={carregando !== null}
                  className="rounded-xl bg-red-50 dark:bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 disabled:opacity-60"
                >
                  {carregando === m.id ? "..." : "Recusar"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
