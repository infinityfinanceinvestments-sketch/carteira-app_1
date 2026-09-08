"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

export default function SolicitarRecomendacao({
  clienteId,
  pendente,
}: {
  clienteId: number;
  pendente: { criado_em: string; mensagem: string | null } | null;
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (pendente) {
    return (
      <div className="rounded-3xl card-sheen p-4 text-sm shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="font-medium text-slate-800 dark:text-slate-100">Pedido enviado ✓</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Você pediu uma recomendação em{" "}
          {new Date(pendente.criado_em).toLocaleDateString("pt-BR")} —
          aguardando resposta do seu consultor.
        </p>
        {pendente.mensagem && (
          <p className="mt-1.5 text-xs italic text-slate-500 dark:text-slate-400">
            &ldquo;{pendente.mensagem}&rdquo;
          </p>
        )}
      </div>
    );
  }

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/clientes/${clienteId}/solicitacoes-recomendacao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagem: mensagem.trim() || undefined }),
        }
      );
      if (!res.ok) {
        setErro("Não foi possível enviar o pedido. Tente de novo.");
        return;
      }
      setMensagem("");
      setAberto(false);
      mostrarToast("Pedido enviado ao consultor!");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] p-4 text-left text-sm font-medium text-[var(--color-navy-950)] shadow-sm"
      >
        + Pedir uma recomendação ao seu consultor
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Pedir recomendação</p>
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder="Alguma coisa específica que você quer que ele veja? (opcional)"
        rows={3}
        maxLength={500}
        className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
      />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="rounded-xl btn-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {enviando ? "Enviando..." : "Enviar pedido"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-xl px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
