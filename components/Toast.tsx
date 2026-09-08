"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type TipoToast = "sucesso" | "erro" | "info";

interface ToastItem {
  id: number;
  mensagem: string;
  tipo: TipoToast;
}

interface ToastContextValue {
  mostrarToast: (mensagem: string, tipo?: TipoToast) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ESTILO_POR_TIPO: Record<TipoToast, string> = {
  sucesso:
    "bg-emerald-600 dark:bg-emerald-500/90 text-white",
  erro: "bg-red-600 dark:bg-red-500/90 text-white",
  info: "bg-[var(--color-navy-900)] dark:bg-white/10 text-white",
};

const ICONE_POR_TIPO: Record<TipoToast, string> = {
  sucesso: "✓",
  erro: "✕",
  info: "ℹ",
};

const DURACAO_MS = 3000;

/** Feedback instantâneo (toast) pras ações principais — aceitar/recusar
 *  recomendação, lançar provento, importar CSV etc. — sem precisar esperar
 *  a tela inteira recarregar/re-renderizar pra saber se deu certo.
 *  Monte uma vez perto da raiz (ver app/layout.tsx) e use useToast() nos
 *  componentes de ação. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const proximoId = useRef(1);

  const mostrarToast = useCallback((mensagem: string, tipo: TipoToast = "sucesso") => {
    const id = proximoId.current++;
    setToasts((atual) => [...atual, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((atual) => atual.filter((t) => t.id !== id));
    }, DURACAO_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-lift)] animate-[toast-in_0.2s_ease-out] ${ESTILO_POR_TIPO[t.tipo]}`}
          >
            <span aria-hidden>{ICONE_POR_TIPO[t.tipo]}</span>
            <span>{t.mensagem}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Use dentro de qualquer client component pra disparar um toast:
 *  const { mostrarToast } = useToast();
 *  mostrarToast("Recomendação aceita!");
 *  Fora do ToastProvider (não deveria acontecer, já que ele fica na raiz),
 *  cai num no-op silencioso em vez de quebrar a tela. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { mostrarToast: () => {} };
  return ctx;
}
