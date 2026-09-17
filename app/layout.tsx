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

// Mesma lógica do tema claro/escuro acima, mas pra cor de acento
// personalizada (ver components/PersonalizacaoCores.tsx e lib/temaCores.ts)
// — sem isso, toda vez que o cliente tivesse escolhido uma cor diferente
// veria um clarão com o azul padrão antes do React montar e aplicar a cor
// salva. Os presets (id !== "personalizado") só guardam o id, então os
// valores de cor ficam centralizados em ESQUEMAS_PADRAO — precisam estar
// repetidos aqui porque este script roda antes de qualquer bundle JS.
const SCRIPT_COR_INICIAL = `
(function () {
  try {
    var salvo = localStorage.getItem("infinity-cor-tema");
    if (!salvo) return;
    var tema = JSON.parse(salvo);
    var presets = {
      verde: { accent: "#10b981", accentDark: "#047857", accentSoft: "#e6f9f1", sky: "#6ee7b7" },
      roxo: { accent: "#8b5cf6", accentDark: "#6d28d9", accentSoft: "#f1ebfe", sky: "#c4b5fd" }
    };
    var esquema = tema.id === "personalizado" && tema.corBase
      ? null
      : presets[tema.id];
    var raiz = document.documentElement.style;
    if (esquema) {
      raiz.setProperty("--color-accent", esquema.accent);
      raiz.setProperty("--color-accent-dark", esquema.accentDark);
      raiz.setProperty("--color-accent-soft", esquema.accentSoft);
      raiz.setProperty("--color-sky", esquema.sky);
    } else if (tema.id === "personalizado" && tema.corBase) {
      // Reaplica só a cor base crua até o React montar e derivar os tons
      // certos (evita reimplementar a mistura de cor em JS puro aqui) —
      // ainda evita boa parte do clarão, já que o acento principal já sai
      // correto; os tons derivados (hover/soft) chegam um instante depois.
      raiz.setProperty("--color-accent", tema.corBase);
    }
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
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_COR_INICIAL }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SERVICE_WORKER }} />
      </head>
      <body className="min-h-full bg-[var(--color-canvas)] text-[var(--color-ink)] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
