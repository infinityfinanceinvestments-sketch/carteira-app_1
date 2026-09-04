"use client";

const CHAVE_TEMA = "infinity-theme";

/** Botão de alternar modo claro/escuro — fica nos cabeçalhos (que já são
 *  sempre escuros por causa do hero-organic), então o estilo do botão em si
 *  não muda com o tema, só o ícone. Qual ícone aparece é decidido só por
 *  CSS (dark:hidden / dark:inline), olhando a classe .dark que já está na
 *  <html> (aplicada de cara pelo script em app/layout.tsx) — assim não
 *  precisa de estado em React nem de useEffect só pra ler o DOM, o que
 *  evita tanto o piscar quanto risco de divergência entre servidor/cliente. */
export default function ThemeToggle() {
  function alternar() {
    const novoEscuro = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", novoEscuro);
    try {
      localStorage.setItem(CHAVE_TEMA, novoEscuro ? "dark" : "light");
    } catch {
      // localStorage indisponível (modo privado, etc.) — a preferência só
      // não é lembrada na próxima visita, não é motivo pra travar o botão.
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Alternar entre modo claro e escuro"
      title="Alternar tema"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/20 text-sm text-white/90 transition hover:bg-white/10"
    >
      <span aria-hidden="true" className="dark:hidden">
        🌙
      </span>
      <span aria-hidden="true" className="hidden dark:inline">
        ☀️
      </span>
    </button>
  );
}
