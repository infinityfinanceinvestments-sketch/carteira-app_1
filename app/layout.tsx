import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Infinity Trading | Consultoria de Investimentos",
  description: "Acompanhamento de carteira e recomendações de investimento",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
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

// Registra o service worker só pra habilitar "instalar app" (PWA) e a tela
// de offline — ver public/sw.js pro porquê de não cachear dados financeiros.
const SCRIPT_SERVICE_WORKER = `
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        {/* Tag "antiga" que o iOS (antes do 17.4) exige pra abrir em tela
            cheia, sem barra do Safari, quando adicionado à Tela de Início.
            O Next 16 já gera a tag nova (mobile-web-app-capable) sozinho. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_INICIAL }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SERVICE_WORKER }} />
      </head>
      <body className="min-h-full bg-[var(--color-canvas)] text-[var(--color-ink)] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
