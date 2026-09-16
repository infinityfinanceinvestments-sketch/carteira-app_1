"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

/** Controle compacto (pensado pra caber numa célula de tabela) pra marcar
 *  uma posição de Renda Fixa como indexada ao CDI — liga a atualização
 *  automática de valor em lib/rendaFixaIndexada.ts. Só aparece nas linhas
 *  de Renda Fixa (ver app/consultor/clientes/[id]/page.tsx). */
export default function IndexadorCdiForm({
  clienteId,
  posicaoId,
  indexador,
  indexadorPercentual,
}: {
  clienteId: number;
  posicaoId: number;
  indexador: string | null;
  indexadorPercentual: number | null;
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [editando, setEditando] = useState(false);
  const [percentual, setPercentual] = useState(String(indexadorPercentual ?? 100));
  const [salvando, setSalvando] = useState(false);

  async function salvar(novoIndexador: "CDI" | null, novoPercentual: number | null) {
    setSalvando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/posicoes/${posicaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexador: novoIndexador, indexador_percentual: novoPercentual }),
      });
      if (!res.ok) {
        mostrarToast("Não foi possível atualizar o indexador.", "erro");
        return;
      }
      mostrarToast(
        novoIndexador ? "Posição marcada como indexada ao CDI." : "Indexação removida."
      );
      setEditando(false);
      router.refresh();
    } catch {
      mostrarToast("Erro de conexão. Tente novamente.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const valor = Number(percentual.replace(",", "."));
          if (!Number.isFinite(valor) || valor <= 0) {
            mostrarToast("Informe um percentual válido do CDI.", "erro");
            return;
          }
          salvar("CDI", valor);
        }}
        className="flex items-center gap-1"
      >
        <input
          type="text"
          inputMode="decimal"
          value={percentual}
          onChange={(e) => setPercentual(e.target.value)}
          className="w-14 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent px-1.5 py-0.5 text-right text-[11px]"
        />
        <span className="text-[11px] text-slate-400">% CDI</span>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-[var(--color-accent,#2563eb)] px-1.5 py-0.5 text-[11px] font-medium text-white disabled:opacity-60"
        >
          OK
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="text-[11px] text-slate-400"
        >
          cancelar
        </button>
      </form>
    );
  }

  if (indexador === "CDI") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          {indexadorPercentual}% CDI
        </span>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-[11px] text-slate-400 underline decoration-dotted"
        >
          editar
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={() => salvar(null, null)}
          className="text-[11px] text-slate-400 underline decoration-dotted disabled:opacity-60"
        >
          remover
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="text-[11px] text-slate-400 dark:text-slate-500 underline decoration-dotted"
    >
      Indexar ao CDI
    </button>
  );
}
