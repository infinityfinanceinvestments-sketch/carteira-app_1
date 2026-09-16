import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "pdf-parse" (importador do extrato da Avenue) usa o pdfjs-dist por baixo,
  // que tenta carregar um "worker" (pdf.worker.mjs) via import dinâmico em
  // tempo de execução. Se o Next empacota esse pacote junto com a rota (o
  // padrão), esse arquivo de worker não vai parar no build e a leitura do
  // PDF quebra em produção com "Setting up fake worker failed: Cannot find
  // module .../pdf.worker.mjs" — mesmo funcionando perfeitamente em
  // desenvolvimento. Colocando aqui, o Next usa o require nativo do Node
  // pra esse pacote (sem empacotar), que resolve o worker do jeito normal.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
