// Service worker mínimo: só existe pra tornar o app instalável (PWA) e dar
// uma tela amigável quando não há conexão. Propositalmente NÃO guarda em
// cache nenhuma página de dados (carteira, recomendações, dashboard) nem
// respostas de API — isso evitaria que o cliente visse números antigos
// pensando que são atuais, o que é inaceitável num app financeiro.
const CACHE = "infinity-shell-v1";
const SHELL_ASSETS = ["/offline.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Só intercepta navegação de página (não API, não dados) — sempre tenta a
  // rede primeiro; só cai pro offline.html se realmente não houver conexão.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
  }
});
