"use client";

import { useState } from "react";

export default function GerarLinkRedefinicao({
  usuarioId,
  nomeCliente,
}: {
  usuarioId: number;
  nomeCliente: string;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function gerar() {
    setErro(null);
    setCopiado(false);
    setCarregando(true);
    try {
      const res = await fetch(`/api/usuarios/${usuarioId}/gerar-redefinicao`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível gerar o link.");
        return;
      }
      setEmailEnviado(Boolean(data.emailEnviado));
      setLink(`${window.location.origin}/redefinir-senha?token=${data.token}`);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      // clipboard indisponível — o link já está visível na tela pra copiar manualmente
    }
  }

  return (
    <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <h2 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Redefinir senha</h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Gere um link de uso único (válido por 1h). Se o envio automático de e-mail estiver
        configurado, ele já vai direto pra {nomeCliente} — senão, você recebe o link aqui
        pra mandar por fora do app (WhatsApp, e-mail pessoal etc.).
      </p>

      {!link ? (
        <button
          type="button"
          onClick={gerar}
          disabled={carregando}
          className="rounded-xl btn-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {carregando ? "Gerando..." : "Gerar link de redefinição"}
        </button>
      ) : (
        <div className="space-y-2">
          {emailEnviado && (
            <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
              ✓ E-mail enviado automaticamente pra {nomeCliente}. O link abaixo é só um backup,
              caso precise reenviar por outro canal.
            </p>
          )}
          <p className="break-all rounded-xl bg-slate-50 dark:bg-white/5 p-2 text-xs text-slate-600 dark:text-slate-300">{link}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copiar}
              className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              {copiado ? "Copiado!" : "Copiar link"}
            </button>
            <button
              type="button"
              onClick={gerar}
              disabled={carregando}
              className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-60"
            >
              Gerar novo
            </button>
          </div>
        </div>
      )}

      {erro && (
        <p className="mt-2 rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">{erro}</p>
      )}
    </section>
  );
}
