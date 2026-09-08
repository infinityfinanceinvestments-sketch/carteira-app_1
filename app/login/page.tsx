"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Preenchido só quando o login exige o código de verificação por e-mail
  // (primeiro acesso deste navegador) — troca a tela pra etapa 2.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, aceita2fa: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível entrar.");
        return;
      }
      if (data.precisaVerificar) {
        setPendingToken(data.pendingToken);
        return;
      }
      router.push(data.destino);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function onSubmitCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/auth/verificar-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, codigo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível verificar o código.");
        return;
      }
      router.push(data.destino);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (pendingToken) {
    return (
      <main className="hero-organic flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)] text-2xl shadow-[var(--shadow-accent)]">
              ✉️
            </div>
            <h1 className="text-xl font-semibold text-white">Confirme seu e-mail</h1>
            <p className="mt-1 text-sm text-white/60">
              Primeiro acesso neste navegador — mandamos um código de 6 dígitos pro seu e-mail.
            </p>
          </div>

          <form
            onSubmit={onSubmitCodigo}
            className="rounded-[28px] card-sheen p-6 shadow-[var(--shadow-lift)]"
          >
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Código de verificação
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
              placeholder="000000"
              maxLength={6}
            />

            {erro && (
              <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="btn-accent w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {carregando ? "Verificando..." : "Confirmar"}
            </button>

            <button
              type="button"
              onClick={() => {
                setPendingToken(null);
                setCodigo("");
                setErro(null);
              }}
              className="mt-3 block w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Voltar
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="hero-organic flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)] text-2xl shadow-[var(--shadow-accent)]">
            ✦
          </div>
          <h1 className="text-xl font-semibold text-white">
            Infinity Trading
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Acesso para consultores e clientes
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-[28px] card-sheen p-6 shadow-[var(--shadow-lift)]"
        >
          <label className="mb-1 block text-sm font-medium text-slate-700">
            E-mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
            placeholder="voce@exemplo.com"
            autoComplete="email"
          />

          <label className="mb-1 block text-sm font-medium text-slate-700">
            Senha
          </label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {erro && (
            <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="btn-accent w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <Link
            href="/esqueci-senha"
            className="mt-3 block text-center text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Esqueci minha senha
          </Link>
        </form>

        <div className="mt-6 rounded-3xl bg-white/5 p-4 text-xs text-white/60">
          <p className="mb-1 font-medium text-white/80">Contas de demonstração</p>
          <p>Consultor: consultor@carteira.app / consultor123</p>
          <p>Cliente: ana@carteira.app / cliente123</p>
        </div>
      </div>
    </main>
  );
}
