interface Props {
  /** Nome da área, ex: "Proventos". Aparece em destaque no card. */
  titulo: string;
  icone?: string;
}

/** Card de aviso pra uma área do app que está temporariamente desligada
 * (ver lib/feature-flags.ts) — mostra que a funcionalidade existe e está
 * a caminho, em vez de simplesmente sumir sem explicação. */
export default function AreaEmConstrucao({ titulo, icone = "🚧" }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl card-sheen p-8 text-center shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <span className="text-3xl">{icone}</span>
      <p className="text-base font-semibold text-black dark:text-white">{titulo}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Estamos trabalhando nessa área — em breve tem novidade por aqui.
      </p>
    </div>
  );
}
