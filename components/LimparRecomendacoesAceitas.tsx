"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

export default function LimparRecomendacoesAceitas({
  clienteId,
  quantidade,
}: {
  clienteId: number;
  quantidade: number;
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [carregando, setCarregando] = useState(false);

  if (quantidade === 0) return null;

  async function limpar() {
    setCarregando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/recomendacoes/limpar-aceitas`, {
        method: "POST",
      });
      if (!res.ok) {
        mostrarToast("Não foi possível limpar agora — tente de novo.", "erro");
        return;
      }
      mostrarToast("Recomendações limpas.");
      router.refresh();
    } catch {
      mostrarToast("Erro de conexão. Tente de novo.", "erro");
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
