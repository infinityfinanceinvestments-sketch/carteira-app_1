"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LimparRecomendacoesAceitas({
  clienteId,
  quantidade,
}: {
  clienteId: number;
  quantidade: number;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  if (quantidade === 0) return null;

  async function limpar() {
    setCarregando(true);
    try {
      await fetch(`/api/clientes/${clienteId}/recomendacoes/limpar-aceitas`, {
        method: "POST",
      });
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={limpar}
      disabled={carregando}
      className="text-xs font-medium text-slate-400 dark:text-slate-500 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-60"
    >
      {carregando ? "Limpando..." : `Limpar aceitas/expiradas (${quantidade})`}
    </button>
  );
}
