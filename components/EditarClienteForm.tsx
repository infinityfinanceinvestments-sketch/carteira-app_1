"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]";

const PERFIL_LABEL: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

/** Aba "Dados do cliente" na página do consultor — edita nome, e-mail
 *  (também atualiza o login em `usuarios`, ver a rota PATCH), telefone,
 *  perfil de investidor e objetivo. Fica fechada (só leitura) até o
 *  consultor clicar em "Editar", mesmo padrão do IndexadorCdiForm. */
export default function EditarClienteForm({
  clienteId,
  nome: nomeInicial,
  email: emailInicial,
  telefone: telefoneInicial,
  perfilRisco: perfilInicial,
  objetivo: objetivoInicial,
}: {
  clienteId: number;
  nome: string;
  email: string;
  telefone: string | null;
  perfilRisco: string;
  objetivo: string | null;
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState(nomeInicial);
  const [email, setEmail] = useState(emailInicial);
  const [telefone, setTelefone] = useState(telefoneInicial ?? "");
  const [perfilRisco, setPerfilRisco] = useState(perfilInicial);
  const [objetivo, setObjetivo] = useState(objetivoInicial ?? "");
  const [erro, setErro] = useState<string | null>(null);

  function cancelar() {
    setNome(nomeInicial);
    setEmail(emailInicial);
    setTelefone(telefoneInicial ?? "");
    setPerfilRisco(perfilInicial);
    setObjetivo(objetivoInicial ?? "");
    setErro(null);
    setEditando(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/dados`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone: telefone.trim() || null,
          perfil_risco: perfilRisco,
          objetivo: objetivo.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível salvar os dados.");
        return;
      }
      mostrarToast("Dados do cliente atualizados!");
      setEditando(false);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (!editando) {
    return (
      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Dados do cliente
          </h2>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Editar
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Nome</dt>
            <dd className="text-slate-800 dark:text-slate-100">{nomeInicial}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">E-mail</dt>
            <dd className="text-slate-800 dark:text-slate-100">{emailInicial}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Telefone</dt>
            <dd className="text-slate-800 dark:text-slate-100">
              {telefoneInicial || <span className="text-slate-400 dark:text-slate-500">—</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Perfil de investidor</dt>
            <dd className="text-slate-800 dark:text-slate-100">
              {PERFIL_LABEL[perfilInicial] ?? perfilInicial}
            </dd>
          </div>
          {objetivoInicial && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-400 dark:text-slate-500">Objetivo</dt>
              <dd className="text-slate-800 dark:text-slate-100">{objetivoInicial}</dd>
            </div>
          )}
        </dl>
      </section>
    );
  }

  return (
    <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
        Editar dados do cliente
      </h2>
      <form onSubmit={salvar} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Nome completo
          </span>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            E-mail (também é o login do cliente)
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Telefone
          </span>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 91234-5678"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Perfil de investidor
          </span>
          <select
            value={perfilRisco}
            onChange={(e) => setPerfilRisco(e.target.value)}
            className={inputClass}
          >
            <option value="conservador">Conservador</option>
            <option value="moderado">Moderado</option>
            <option value="arrojado">Arrojado</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Objetivo financeiro (opcional)
          </span>
          <textarea
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </label>

        {erro && (
          <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
            {erro}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl btn-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={cancelar}
            disabled={salvando}
            className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
