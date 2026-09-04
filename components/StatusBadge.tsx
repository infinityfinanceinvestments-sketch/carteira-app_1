const STATUS_STYLES: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  enviada: "bg-blue-100 text-blue-800",
  aceita: "bg-emerald-100 text-emerald-800",
  recusada: "bg-red-100 text-red-800",
  executada: "bg-slate-200 dark:bg-white/15 text-slate-700 dark:text-slate-200",
  expirada: "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
  executada: "Executada",
  expirada: "Expirada",
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
