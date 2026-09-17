"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

interface RecadoResumo {
  id: number;
  mensagem: string;
  criado_em: string;
}

const formatData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Mural de recados do consultor pros próprios clientes — mensagens curtas
 *  tipo "mercado caiu hoje por causa de X, mantenham a calma", visíveis por
 *  TODOS os clientes desse consultor (ver lib/repo/recados.ts). Inspirado no
 *  conteúdo editorial que apps como XP/BTG mostram dentro do próprio app. */
export default function RecadosConsultor({ recados }: { recados: RecadoResumo[] }) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  async function publicar() {
    setErro(null);
    if (!mensagem.trim()) {
      setErro("Escreva uma mensagem.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/recados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: mensagem.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível publicar. Tente de novo.");
        return;
      }
      mostrarToast("Recado publicado pros seus clientes!");
      setMensagem("");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(id: number) {
    setExcluindoId(id);
    try {
      const res = await fetch(`/api/recados/${id}`, { method: "DELETE" });
      if (res.ok) {
        mostrarToast("Recado excluído.");
        router.refresh();
      }
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
        Recados pros seus clientes
      </h2>

      <div className="space-y-2">
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Ex: O mercado caiu hoje por causa de X — não é motivo pra alarme, mantenham a calma."
          rows={2}
          maxLength={1000}
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        />
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <button
          type="button"
          onClick={publicar}
          disabled={enviando}
          className="rounded-xl btn-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {enviando ? "Publicando..." : "Publicar pra todos os clientes"}
        </button>
      </div>

      {recados.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-slate-100 dark:border-white/10 pt-3">
          {recados.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="block text-slate-700 dark:text-slate-200">{r.mensagem}</span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                  {formatData(r.criado_em)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => excluir(r.id)}
                disabled={excluindoId === r.id}
                className="shrink-0 text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 disabled:opacity-60"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
