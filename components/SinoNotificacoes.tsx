"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Notificacao {
  id: number;
  tipo: "recomendacao" | "variacao_preco" | "desvio_modelo" | "objetivo_concluido";
  titulo: string;
  mensagem: string;
  lida: number;
  criado_em: string;
}

const REFRESH_MS = 60_000;

function formatQuando(iso: string): string {
  const data = new Date(iso.replace(" ", "T") + "Z");
  const agora = Date.now();
  const diffMin = Math.round((agora - data.getTime()) / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.round(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras}h`;
  const diffDias = Math.round(diffHoras / 24);
  return `há ${diffDias}d`;
}

export default function SinoNotificacoes({ clienteId }: { clienteId: number }) {
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const buscar = useCallback(async () => {
    try {
      const res = await fetch(`/api/clientes/${clienteId}/notificacoes`);
      if (!res.ok) return;
      const data = await res.json();
      setNotificacoes(data.notificacoes ?? []);
      setNaoLidas(data.naoLidas ?? 0);
    } catch {
      // best effort — mantém o que já tinha na tela
    }
  }, [clienteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    buscar();
    const intervalo = setInterval(() => buscar(), REFRESH_MS);
    return () => clearInterval(intervalo);
  }, [buscar]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  async function abrir() {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);
    if (vaiAbrir && naoLidas > 0) {
      setNaoLidas(0);
      try {
        await fetch(`/api/clientes/${clienteId}/notificacoes/marcar-lidas`, { method: "POST" });
      } catch {
        // se falhar, o contador volta a aparecer na próxima busca automática
      }
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={abrir}
        aria-label="Notificações"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white"
      >
        <span className="text-lg">🔔</span>
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-3xl card-sheen text-slate-800 dark:text-slate-100 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="border-b border-slate-100 dark:border-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Notificações
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                Nenhuma notificação ainda.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {notificacoes.map((n) => (
                  <li key={n.id} className={`px-3 py-2.5 ${n.lida ? "" : "bg-blue-50/50 dark:bg-blue-500/10"}`}>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{n.mensagem}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                      {formatQuando(n.criado_em)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
