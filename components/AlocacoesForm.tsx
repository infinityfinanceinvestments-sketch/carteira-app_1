"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLASSES_ATIVO } from "@/lib/types";
import { useToast } from "./Toast";

export interface AlocacaoInicial {
  classe: string;
  percentual_alvo: number;
}

export default function AlocacoesForm({
  carteiraModeloId,
  alocacoesIniciais,
  modoCriacao = false,
  nomeInicial = "",
  descricaoInicial = "",
}: {
  carteiraModeloId?: number;
  alocacoesIniciais: AlocacaoInicial[];
  modoCriacao?: boolean;
  nomeInicial?: string;
  descricaoInicial?: string;
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [nome, setNome] = useState(nomeInicial);
  const [descricao, setDescricao] = useState(descricaoInicial);
  const [valores, setValores] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = Object.fromEntries(
      CLASSES_ATIVO.map((c) => [c, 0])
    );
    for (const a of alocacoesIniciais) base[a.classe] = a.percentual_alvo;
    return base;
  });
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const soma = Object.values(valores).reduce((a, b) => a + Number(b || 0), 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (Math.round(soma) !== 100) {
      setErro(`A soma das alocações deve ser 100% (atual: ${soma.toFixed(1)}%).`);
      return;
    }
    setCarregando(true);
    const alocacoes = CLASSES_ATIVO.filter((c) => Number(valores[c]) > 0).map(
      (c) => ({ classe: c, percentual_alvo: Number(valores[c]) })
    );
    try {
      if (modoCriacao) {
        const res = await fetch("/api/carteiras-modelo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, descricao, alocacoes }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErro(data.erro ?? "Não foi possível criar a carteira-modelo.");
          return;
        }
        mostrarToast("Carteira-modelo criada!");
        router.push(`/consultor/carteiras-modelo/${data.id}`);
      } else if (carteiraModeloId) {
        const res = await fetch(`/api/carteiras-modelo/${carteiraModeloId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alocacoes }),
        });
        if (!res.ok) {
          setErro("Não foi possível salvar as alocações.");
          return;
        }
        mostrarToast("Alocações salvas!");
      }
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {modoCriacao && (
        <>
          <input
            required
            placeholder="Nome da carteira-modelo (ex: Perfil Moderado 2026)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm"
          />
          <input
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm"
          />
        </>
      )}

      <div className="space-y-2 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Alocação-alvo por classe (%)
        </p>
        {CLASSES_ATIVO.map((c) => (
          <div key={c} className="flex items-center justify-between gap-3">
            <label className="text-sm text-slate-600 dark:text-slate-300">{c}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={valores[c]}
              onChange={(e) =>
                setValores((v) => ({ ...v, [c]: Number(e.target.value) }))
              }
              className="w-20 rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1 text-right text-sm"
            />
          </div>
        ))}
        <div
          className={`flex justify-between border-t border-slate-100 dark:border-white/5 pt-2 text-sm font-medium ${
            Math.round(soma) === 100 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
          }`}
        >
          <span>Total</span>
          <span>{soma.toFixed(1)}%</span>
        </div>
      </div>

      {erro && (
        <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>
      )}

      <button
        type="submit"
        disabled={carregando}
        className="w-full rounded-xl btn-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {carregando
          ? "Salvando..."
          : modoCriacao
            ? "Criar carteira-modelo"
            : "Salvar alocações"}
      </button>
    </form>
  );
}
