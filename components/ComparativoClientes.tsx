"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface ClienteComparativo {
  id: number;
  nome: string;
  perfil_risco: string;
  benchmark: string;
  valorTotal: number;
  rentabilidadePercentual: number | null;
}

const PERFIL_LABEL: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Ordenacao = "nome" | "valor_desc" | "valor_asc" | "rentab_desc" | "rentab_asc" | "perfil";

const OPCOES_ORDENACAO: { valor: Ordenacao; rotulo: string }[] = [
  { valor: "valor_desc", rotulo: "Patrimônio (maior primeiro)" },
  { valor: "valor_asc", rotulo: "Patrimônio (menor primeiro)" },
  { valor: "rentab_desc", rotulo: "Rentabilidade (maior primeiro)" },
  { valor: "rentab_asc", rotulo: "Rentabilidade (menor primeiro)" },
  { valor: "perfil", rotulo: "Perfil de risco" },
  { valor: "nome", rotulo: "Nome (A-Z)" },
];

const ORDEM_PERFIL: Record<string, number> = {
  conservador: 0,
  moderado: 1,
  arrojado: 2,
};

export default function ComparativoClientes({ clientes }: { clientes: ClienteComparativo[] }) {
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("valor_desc");

  const totalGeral = useMemo(
    () => clientes.reduce((soma, c) => soma + c.valorTotal, 0),
    [clientes]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = termo
      ? clientes.filter((c) => c.nome.toLowerCase().includes(termo))
      : clientes;

    const copia = [...lista];
    switch (ordenacao) {
      case "valor_desc":
        copia.sort((a, b) => b.valorTotal - a.valorTotal);
        break;
      case "valor_asc":
        copia.sort((a, b) => a.valorTotal - b.valorTotal);
        break;
      case "rentab_desc":
        copia.sort(
          (a, b) =>
            (b.rentabilidadePercentual ?? -Infinity) - (a.rentabilidadePercentual ?? -Infinity)
        );
        break;
      case "rentab_asc":
        copia.sort(
          (a, b) =>
            (a.rentabilidadePercentual ?? Infinity) - (b.rentabilidadePercentual ?? Infinity)
        );
        break;
      case "perfil":
        copia.sort(
          (a, b) =>
            (ORDEM_PERFIL[a.perfil_risco] ?? 99) - (ORDEM_PERFIL[b.perfil_risco] ?? 99) ||
            a.nome.localeCompare(b.nome)
        );
        break;
      default:
        copia.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return copia;
  }, [clientes, busca, ordenacao]);

  if (clientes.length === 0) {
    return (
      <p className="rounded-3xl card-sheen p-6 text-center text-sm text-slate-400 dark:text-slate-500 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        Nenhum cliente cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Patrimônio total sob gestão
        </p>
        <p className="text-xl font-semibold text-black dark:text-white">{formatBRL(totalGeral)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{clientes.length} cliente(s)</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        />
        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
          className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm"
        >
          {OPCOES_ORDENACAO.map((op) => (
            <option key={op.valor} value={op.valor}>
              {op.rotulo}
            </option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-3xl card-sheen p-6 text-center text-sm text-slate-400 dark:text-slate-500 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          Nenhum cliente encontrado pra &quot;{busca}&quot;.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl card-sheen shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Perfil</th>
                <th className="px-3 py-2 font-medium text-right">Patrimônio</th>
                <th className="px-3 py-2 font-medium text-right">% da carteira</th>
                <th className="px-3 py-2 font-medium text-right">Rentab.</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 dark:border-white/5 last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/consultor/clientes/${c.id}`}
                      className="font-medium text-black dark:text-white hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {PERFIL_LABEL[c.perfil_risco] ?? c.perfil_risco}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-black dark:text-white">
                    {formatBRL(c.valorTotal)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                    {totalGeral > 0 ? `${((c.valorTotal / totalGeral) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      c.rentabilidadePercentual == null
                        ? "text-slate-400 dark:text-slate-500"
                        : c.rentabilidadePercentual >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                    }`}
                  >
                    {c.rentabilidadePercentual == null
                      ? "—"
                      : `${c.rentabilidadePercentual >= 0 ? "+" : ""}${c.rentabilidadePercentual.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        {filtrados.length} de {clientes.length} cliente(s)
      </p>
    </div>
  );
}
