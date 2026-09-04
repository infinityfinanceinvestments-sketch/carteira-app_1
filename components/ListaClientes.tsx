"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface ClienteResumo {
  id: number;
  nome: string;
  email: string;
  perfil_risco: string;
  valorTotal: number;
}

const PERFIL_LABEL: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Ordenacao = "nome" | "valor_desc" | "valor_asc" | "perfil";

const OPCOES_ORDENACAO: { valor: Ordenacao; rotulo: string }[] = [
  { valor: "nome", rotulo: "Nome (A-Z)" },
  { valor: "valor_desc", rotulo: "Patrimônio (maior primeiro)" },
  { valor: "valor_asc", rotulo: "Patrimônio (menor primeiro)" },
  { valor: "perfil", rotulo: "Perfil de risco" },
];

const ORDEM_PERFIL: Record<string, number> = {
  conservador: 0,
  moderado: 1,
  arrojado: 2,
};

export default function ListaClientes({ clientes }: { clientes: ClienteResumo[] }) {
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = termo
      ? clientes.filter(
          (c) =>
            c.nome.toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo)
        )
      : clientes;

    const copia = [...lista];
    switch (ordenacao) {
      case "valor_desc":
        copia.sort((a, b) => b.valorTotal - a.valorTotal);
        break;
      case "valor_asc":
        copia.sort((a, b) => a.valorTotal - b.valorTotal);
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
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
        <ul className="space-y-2">
          {filtrados.map((c) => (
            <li key={c.id}>
              <Link
                href={`/consultor/clientes/${c.id}`}
                className="flex items-center justify-between rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10"
              >
                <div>
                  <p className="text-sm font-medium text-black dark:text-white">{c.nome}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {PERFIL_LABEL[c.perfil_risco] ?? c.perfil_risco} · {c.email}
                  </p>
                </div>
                <p className="text-sm font-semibold text-black dark:text-white">
                  {formatBRL(c.valorTotal)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        {filtrados.length} de {clientes.length} cliente(s)
      </p>
    </div>
  );
}
