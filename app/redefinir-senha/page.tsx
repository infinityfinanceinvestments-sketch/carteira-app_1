"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validarForcaSenha } from "@/lib/senha";

function FormularioRedefinicao() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [verificando, setVerificando] = useState(true);
  const [valido, setValido] = useState(false);
  const [nome, setNome] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function verificar() {
      if (!token) {
        setVerificando(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/redefinir-senha/verificar?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (cancelado) return;
        setValido(Boolean(data.valido));
        setNome(data.nome ?? null);
      } catch {
        if (!cancelado) setValido(false);
      } finally {
        if (!cancelado) setVerificando(false);
      }
    }
    verificar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const erroForca = validarForcaSenha(novaSenha);
    if (erroForca) {
      setErro(erroForca);
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível redefinir a senha.");
        return;
      }
      setSucesso(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (verificando) {
    return <p className="text-center text-sm text-white/60">Verificando link...</p>;
  }

  if (!valido) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-xl shadow-black/20">
        <p className="text-sm text-slate-700">
          Esse link é inválido ou já expirou. Peça um novo link ao seu consultor.
        </p>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-xl shadow-black/20">
        <p className="text-sm text-slate-700">
          Senha redefinida com sucesso! Te levando pro login...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[28px] card-sheen p-6 shadow-[var(--shadow-lift)]"
    >
      {nome && (
        <p className="mb-4 text-sm text-slate-600">Olá, {nome}. Escolha sua nova senha.</p>
      )}
      <label className="mb-1 block text-sm font-medium text-slate-700">Nova senha</label>
      <input
        type="password"
        required
        value={novaSenha}
        onChange={(e) => setNovaSenha(e.target.value)}
        className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        placeholder="••••••••"
        autoComplete="new-password"
      />
      <p className="-mt-2 mb-4 text-xs text-slate-400">
        Mínimo de 8 caracteres, com pelo menos uma letra e um número.
      </p>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Confirmar nova senha
      </label>
      <input
        type="password"
        required
        value={confirmarSenha}
        onChange={(e) => setConfirmarSenha(e.target.value)}
        className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        placeholder="••••••••"
        autoComplete="new-password"
      />
      {erro && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl btn-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {enviando ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <main className="hero-organic flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
            🔑
          </div>
          <h1 className="text-xl font-semibold text-white">Redefinir senha</h1>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-white/60">Carregando...</p>}>
          <FormularioRedefinicao />
        </Suspense>
      </div>
    </main>
  );
}
