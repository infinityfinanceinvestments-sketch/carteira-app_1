import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));

// Testa só a lógica pura de lib/ (regras de senha, rate limit, cálculos de
// carteira, etc.) — nada de banco/rede aqui, de propósito: são testes
// rápidos e determinísticos que rodam em qualquer máquina sem setup.
export default defineConfig({
  resolve: {
    alias: {
      "@": diretorioAtual,
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
