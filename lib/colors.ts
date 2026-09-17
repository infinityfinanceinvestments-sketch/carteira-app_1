// Paleta categórica para as 7 classes de ativo suportadas. Mantém contraste
// suficiente em fundo claro e é consistente em todos os gráficos do app.
export const CLASS_COLORS: Record<string, string> = {
  "Renda Fixa": "#1c3f6e",
  "Ações": "#2f8f6e",
  Fundos: "#c8862b",
  FIIs: "#7c5cbf",
  ETFs: "#2b8fc0",
  "Moeda Estrangeira": "#b3455a",
  Cripto: "#6b7280",
  // Rótulos dos GRUPOS usados na tela de alocação do cliente (ver
  // lib/gruposAtivo.ts) — mais enxutos que as 7 classes técnicas acima
  // (que continuam servindo as carteiras-modelo/desvio). "Fundos
  // Imobiliários" reaproveita o tom de FIIs e "Exterior" o de ETFs, já
  // que são a mesma família de ativo só com nome mais claro pro cliente.
  "Fundos Imobiliários": "#7c5cbf",
  Exterior: "#2b8fc0",
  Criptoativos: "#6b7280",
};

export function corDaClasse(classe: string): string {
  return CLASS_COLORS[classe] ?? "#64748b";
}

export const COR_GANHO = "#15803d";
export const COR_PERDA = "#b91c1c";
