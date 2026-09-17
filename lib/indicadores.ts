// Só os tipos/constantes "puros" dos indicadores de benchmark — extraído de
// lib/indices.ts pra poder ser importado por componentes de CLIENTE (ex:
// components/EvolutionChart.tsx) sem arrastar junto o resto daquele
// arquivo, que puxa lib/repo/indices.ts -> lib/db.ts (node:sqlite). Um
// "use client" que importasse de lib/indices.ts direto quebrava o build
// (Turbopack tenta empacotar node:sqlite pro navegador e falha).
export type Indicador = "CDI" | "IPCA" | "IBOV" | "SP500";

export const INDICADORES_VALIDOS: Indicador[] = ["CDI", "IPCA", "IBOV", "SP500"];

export const LABEL_INDICADOR: Record<Indicador, string> = {
  CDI: "CDI",
  IPCA: "IPCA",
  IBOV: "Ibovespa",
  SP500: "S&P 500",
};
