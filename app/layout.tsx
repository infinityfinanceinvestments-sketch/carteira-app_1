import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infinity Trading | Consultoria de Investimentos",
  description: "Acompanhamento de carteira e recomendações de investimento",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Infinity Trading" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a1830",
};

// Aplica a classe .dark na <html> ANTES da página pintar na tela, lendo a
// preferência salva (ou, na primeira visita, a preferência do sistema) —
// sem isso, toda vez que alguém abre o app no modo escuro veria um clarão
// branco por uma fração de segundo antes do React montar e trocar o tema.
const SCRIPT_TEMA_INICIAL = `
(function () {
  try {
    var salvo = localStorage.getItem("infinity-theme");
    var escuro = salvo ? salvo === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (escuro) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_INICIAL }} />
      </head>
      <body className="min-h-full bg-[var(--color-canvas)] text-[var(--color-ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
