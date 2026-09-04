import { spawn } from "node:child_process";
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT_DIR = "/tmp/screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + "/login");
      if (res.ok) return true;
    } catch {
      // ainda subindo
    }
    await sleep(500);
  }
  return false;
}

const APP_DIR = process.env.APP_DIR || process.cwd();
const server = spawn("npm", ["run", "start"], {
  cwd: APP_DIR,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

const up = await waitForServer(20000);
if (!up) {
  console.error("Servidor não subiu a tempo.");
  server.kill("SIGKILL");
  process.exit(1);
}
console.log("Servidor no ar, iniciando captura de telas...");

async function shot(context, path, file, { width = 420, height = 860 } = {}) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/${file}`, fullPage: true });
  await page.close();
}

async function login(context, email, senha) {
  const page = await context.newPage();
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', senha);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  await page.close();
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});

try {
  const anon = await browser.newContext();
  await shot(anon, "/login", "01-login.png");
  await anon.close();

  const consultor = await browser.newContext();
  await login(consultor, "consultor@carteira.app", "consultor123");
  await shot(consultor, "/consultor/dashboard", "02-consultor-dashboard.png");
  await shot(
    consultor,
    "/consultor/clientes/1",
    "03-consultor-cliente-detalhe.png",
    { width: 420, height: 1600 }
  );
  await shot(
    consultor,
    "/consultor/carteiras-modelo/2",
    "04-consultor-carteira-modelo.png"
  );
  await consultor.close();

  const cliente = await browser.newContext();
  await login(cliente, "ana@carteira.app", "cliente123");
  await shot(cliente, "/cliente/carteira", "05-cliente-carteira.png", {
    width: 420,
    height: 1200,
  });
  await shot(cliente, "/cliente/recomendacoes", "06-cliente-recomendacoes.png");
  await cliente.close();

  console.log("Screenshots salvos em " + OUT_DIR);
} finally {
  await browser.close();
  server.kill("SIGKILL");
}
