"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLASSES_ATIVO } from "@/lib/types";

const TIPOS = [
  { valor: "compra", label: "Compra" },
  { valor: "venda", label: "Venda" },
  { valor: "manutencao", label: "Manutenção" },
  { valor: "rebalanceamento", label: "Rebalanceamento" },
];

export default function RecomendacaoForm({ clienteId }: { clienteId: number }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState("");
  const [classe, setClasse] = useState<string>(CLASSES_ATIVO[0]);
  const [tipoOperacao, setTipoOperacao] = useState("compra");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/recomendacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ativo,
          classe,
          tipo_operacao: tipoOperacao,
          justificativa,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.erro ?? "Não foi possível registrar a recomendação.");
        return;
      }
      setAtivo("");
      setJustificativa("");
      setAberto(false);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="w-full rounded-xl border border-dashed border-slate-200 dark:border-white/10 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      >
        + Nova recomendação
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2.5 rounded-xl border border-slate-200 dark:border-white/10 p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          placeholder="Ativo (ex: TESOURO IPCA+ 2029)"
          value={ativo}
          onChange={(e) => setAtivo(e.target.value)}
          className="col-span-2 rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <select
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-sm"
        >
          {CLASSES_ATIVO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={tipoOperacao}
          onChange={(e) => setTipoOperacao(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-sm"
        >
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        required
        placeholder="Justificativa/racional da recomendação"
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={carregando}
          className="flex-1 rounded-xl btn-accent py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {carregando ? "Enviando..." : "Enviar ao cliente"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
