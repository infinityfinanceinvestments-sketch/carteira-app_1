// Personalização de cor do app (tela "Meu perfil" do cliente) — o app usa
// só 3 variáveis CSS pro acento de cor (--color-accent, --color-accent-dark
// e --color-accent-soft, além de --color-sky no degradê dos botões), então
// dá pra "trocar a cor do app inteiro" sobrescrevendo só essas três direto
// no <html>, sem duplicar nenhuma folha de estilo. Guardado só no
// localStorage (por aparelho/navegador), do mesmo jeito que o modo
// claro/escuro em ThemeToggle.tsx.

export interface EsquemaCor {
  id: string;
  nome: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  sky: string;
}

// O primeiro (azul) é o visual padrão original do app — os valores batem
// exatamente com os definidos em app/globals.css.
export const ESQUEMAS_PADRAO: EsquemaCor[] = [
  {
    id: "azul",
    nome: "Azul Infinity",
    accent: "#2f7dfb",
    accentDark: "#1c5ee0",
    accentSoft: "#eaf1ff",
    sky: "#7fc2ff",
  },
  {
    id: "verde",
    nome: "Verde Esmeralda",
    accent: "#10b981",
    accentDark: "#047857",
    accentSoft: "#e6f9f1",
    sky: "#6ee7b7",
  },
  {
    id: "roxo",
    nome: "Roxo Ametista",
    accent: "#8b5cf6",
    accentDark: "#6d28d9",
    accentSoft: "#f1ebfe",
    sky: "#c4b5fd",
  },
];

export const CHAVE_COR_TEMA = "infinity-cor-tema";

function paraRgb(hex: string): [number, number, number] {
  const limpo = hex.replace("#", "");
  const cheio =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;
  const n = parseInt(cheio, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paraHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  return (
    "#" +
    [r, g, b]
      .map((v) => clamp(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

function misturar(hex: string, alvo: [number, number, number], peso: number): string {
  const [r, g, b] = paraRgb(hex);
  return paraHex([
    r + (alvo[0] - r) * peso,
    g + (alvo[1] - g) * peso,
    b + (alvo[2] - b) * peso,
  ]);
}

/** A partir de UMA cor escolhida livremente pelo cliente, deriva o tom mais
 *  escuro (hover/gradiente) e os tons bem claros (soft/sky) — assim ele só
 *  escolhe uma cor no seletor e o app monta o esquema inteiro sozinho,
 *  mantendo a mesma "forma" visual dos presets acima. */
export function derivarEsquemaPersonalizado(corBase: string): EsquemaCor {
  return {
    id: "personalizado",
    nome: "Personalizada",
    accent: corBase,
    accentDark: misturar(corBase, [0, 0, 0], 0.28),
    accentSoft: misturar(corBase, [255, 255, 255], 0.92),
    sky: misturar(corBase, [255, 255, 255], 0.45),
  };
}

export function aplicarEsquemaCor(esquema: EsquemaCor) {
  const raiz = document.documentElement.style;
  raiz.setProperty("--color-accent", esquema.accent);
  raiz.setProperty("--color-accent-dark", esquema.accentDark);
  raiz.setProperty("--color-accent-soft", esquema.accentSoft);
  raiz.setProperty("--color-sky", esquema.sky);
}

export function limparEsquemaCor() {
  const raiz = document.documentElement.style;
  raiz.removeProperty("--color-accent");
  raiz.removeProperty("--color-accent-dark");
  raiz.removeProperty("--color-accent-soft");
  raiz.removeProperty("--color-sky");
}
