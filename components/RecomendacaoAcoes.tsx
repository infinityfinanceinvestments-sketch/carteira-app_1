"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecomendacaoAcoes({
  recomendacaoId,
  papel,
}: {
  recomendacaoId: number;
  papel: "consultor" | "cliente";
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState<string | null>(null);

  async function mudarStatus(status: string) {
    setCarregando(status);
    try {
      await fetch(`/api/recomendacoes/${recomendacaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setCarregando(null);
    }
  }

  if (papel === "cliente") {
    return (
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => mudarStatus("aceita")}
          disabled={carregando !== null}
          className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
        >
          {carregando === "aceita" ? "..." : "Aceitar"}
        </button>
        <button
          onClick={() => mudarStatus("recusada")}
          disabled={carregando !== null}
          className="rounded-xl bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 disabled:opacity-60"
        >
          {carregando === "recusada" ? "..." : "Recusar"}
        </button>
        <button
          onClick={() => mudarStatus("executada")}
          disabled={carregando !== null}
          className="rounded-xl bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-60"
        >
          {carregando === "executada" ? "..." : "Já executei"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {["enviada", "aceita", "recusada", "executada", "expirada"].map((s) => (
        <button
          key={s}
          onClick={() => mudarStatus(s)}
          disabled={carregando !== null}
          className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-60"
        >
          {carregando === s ? "..." : `Marcar ${s}`}
        </button>
      ))}
    </div>
  );
}
