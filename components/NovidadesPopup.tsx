"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Novidade {
  id: number;
  tipo: "objetivo_criado" | "recomendacao";
  titulo: string;
  mensagem: string;
}

const ICONE: Record<Novidade["tipo"], string> = {
  objetivo_criado: "🎯",
  recomendacao: "📋",
};

const LINK: Record<Novidade["tipo"], string> = {
  objetivo_criado: "/cliente/objetivos",
  recomendacao: "/cliente/recomendacoes",
};

const LABEL_LINK: Record<Novidade["tipo"], string> = {
  objetivo_criado: "Ver objetivo",
  recomendacao: "Ver recomendação",
};

/** Popup que aparece na tela inicial do cliente (Minha carteira) quando tem
 *  objetivo novo ou recomendação nova — diferente do sino (que só mostra
 *  quando o cliente clica), esse aparece sozinho assim que a tela carrega,
 *  pra garantir que o cliente realmente veja a novidade. Ao fechar (ou
 *  clicar em "Ver"), marca só as notificações mostradas aqui como lidas —
 *  não mexe no sino, que pode ter outras notificações não relacionadas
 *  (ex: variação de preço) que o cliente ainda não viu. */
export default function NovidadesPopup({
  clienteId,
  novidades,
}: {
  clienteId: number;
  novidades: Novidade[];
}) {
  const router = useRouter();
  const [lista, setLista] = useState(novidades);
  const [fechando, setFechando] = useState(false);

  if (lista.length === 0 || fechando) return null;

  async function marcarLida(id: number) {
    try {
      await fetch(`/api/clientes/${clienteId}/notificacoes/${id}`, { method: "PATCH" });
    } catch {
      // best effort — na próxima visita o popup pode aparecer de novo, sem problema
    }
  }

  async function fecharTudo() {
    setFechando(true);
    await Promise.all(lista.map((n) => marcarLida(n.id)));
  }

  async function irPara(n: Novidade) {
    await marcarLida(n.id);
    setLista((prev) => prev.filter((x) => x.id !== n.id));
    setFechando(true);
    router.push(LINK[n.tipo]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl card-sheen p-4 shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Novidades</h2>
          <button
            type="button"
            onClick={fecharTudo}
            aria-label="Fechar"
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-2">
          {lista.map((n) => (
            <li
              key={n.id}
              className="rounded-2xl border border-slate-100 dark:border-white/5 p-3"
            >
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                <span>{ICONE[n.tipo]}</span>
                {n.titulo}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.mensagem}</p>
              <button
                type="button"
                onClick={() => irPara(n)}
                className="mt-2 text-xs font-semibold text-[var(--color-accent)]"
              >
                {LABEL_LINK[n.tipo]} →
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={fecharTudo}
          className="mt-3 w-full rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
