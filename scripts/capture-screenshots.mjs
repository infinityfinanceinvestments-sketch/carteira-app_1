import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT_DIR = "/tmp/screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

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

// ---- Login (tela pública) ----
const anon = await browser.newContext();
await shot(anon, "/login", "01-login.png");
await anon.close();

// ---- Consultor ----
const consultor = await browser.newContext();
await login(consultor, "consultor@carteira.app", "consultor123");
await shot(consultor, "/consultor/dashboard", "02-consultor-dashboard.png");
await shot(consultor, "/consultor/clientes/1", "03-consultor-cliente-detalhe.png", {
  width: 420,
  height: 1500,
});
await shot(consultor, "/consultor/carteiras-modelo/2", "04-consultor-carteira-modelo.png");
await consultor.close();

// ---- Cliente ----
const cliente = await browser.newContext();
await login(cliente, "ana@carteira.app", "cliente123");
await shot(cliente, "/cliente/carteira", "05-cliente-carteira.png", { width: 420, height: 1100 });
await shot(cliente, "/cliente/recomendacoes", "06-cliente-recomendacoes.png");
await cliente.close();

await browser.close();
console.log("Screenshots salvos em " + OUT_DIR);
