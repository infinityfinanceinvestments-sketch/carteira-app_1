// Setinha + percentual colorido (verde ganho / vermelho perda) — extraído
// do EvolutionChart pra ser reaproveitado também na lista de alocação por
// classe (ver AlocacaoView.tsx), evitando duas implementações da mesma
// "carinha" de rentabilidade que os apps de corretora usam em vários
// lugares da tela.
export const formatPercent = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

export default function VariacaoBadge({
  valor,
  tamanho = "normal",
}: {
  valor: number | null;
  tamanho?: "normal" | "grande";
}) {
  if (valor == null || Number.isNaN(valor)) return null;
  const positivo = valor >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold ${
        tamanho === "grande" ? "text-base" : "text-sm"
      } ${positivo ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
    >
      {positivo ? "↑" : "↓"} {formatPercent(Math.abs(valor))}
    </span>
  );
}
