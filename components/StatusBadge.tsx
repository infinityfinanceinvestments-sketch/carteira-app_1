const STATUS_STYLES: Record<string, string> = {
  pendente: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  enviada: "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300",
  aceita: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  recusada: "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300",
  executada: "bg-slate-200 dark:bg-white/15 text-slate-700 dark:text-slate-200",
  expirada: "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400",
  aprovada: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
  executada: "Executada",
  expirada: "Expirada",
  aprovada: "Aprovada",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
