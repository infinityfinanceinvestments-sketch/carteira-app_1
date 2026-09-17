"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]";

/** Bloco "Dados de contato" da tela de perfil do cliente — por padrão só
 *  mostra os dados (como sempre foi), com um botão "Editar" que abre os
 *  campos pra ele mesmo trocar e-mail e telefone. Só mexe no cadastro
 *  (clientes.email/telefone) — o e-mail de LOGIN não muda por aqui, ver
 *  comentário em app/api/clientes/[id]/perfil/route.ts. */
export default function EditarContatoForm({
  clienteId,
  email,
  telefone,
}: {
  clienteId: number;
  email: string;
  telefone: string | null;
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [editando, setEditando] = useState(false);
  const [novoEmail, setNovoEmail] = useState(email);
  const [novoTelefone, setNovoTelefone] = useState(telefone ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    if (!novoEmail.trim()) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/perfil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: novoEmail.trim(),
          telefone: novoTelefone.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível salvar. Tente de novo.");
        return;
      }
      mostrarToast("Dados atualizados!");
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
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-800 dark:text-slate-100">{email}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {telefone || "Telefone não informado"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNovoEmail(email);
            setNovoTelefone(telefone ?? "");
            setErro(null);
            setEditando(true);
          }}
          className="shrink-0 rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
          E-mail
        </span>
        <input
          type="email"
          value={novoEmail}
          onChange={(e) => setNovoEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Telefone
        </span>
        <input
          value={novoTelefone}
          onChange={(e) => setNovoTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
          className={inputClass}
        />
      </label>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded-xl btn-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          disabled={salvando}
          className="rounded-xl px-3 py-2 text-sm text-slate-500 dark:text-slate-400 disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
