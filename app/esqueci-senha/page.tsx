import Link from "next/link";

export default function EsqueciSenhaPage() {
  return (
    <main className="hero-organic flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
            🔑
          </div>
          <h1 className="text-xl font-semibold text-white">Esqueci minha senha</h1>
        </div>
        <div className="rounded-[28px] card-sheen p-6 text-sm leading-relaxed text-slate-700 shadow-[var(--shadow-lift)]">
          <p>
            Por enquanto a redefinição de senha é feita pelo seu consultor: entre em
            contato com ele (whatsapp, e-mail etc.) e peça um novo link de acesso.
          </p>
          <p className="mt-3">
            O consultor consegue gerar esse link direto na tela do seu cadastro.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-4 block text-center text-sm font-medium text-white/70 hover:text-white"
        >
          Voltar pro login
        </Link>
      </div>
    </main>
  );
}
