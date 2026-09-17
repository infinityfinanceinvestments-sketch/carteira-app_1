interface RecadoResumo {
  id: number;
  mensagem: string;
  criado_em: string;
}

const formatData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Lista somente-leitura dos recados mais recentes do consultor, pro
 *  cliente ver na própria tela de carteira — ver components/RecadosConsultor.tsx
 *  (lado de quem publica) e lib/repo/recados.ts. Não renderiza nada se não
 *  houver recados. */
export default function RecadosCliente({ recados }: { recados: RecadoResumo[] }) {
  if (recados.length === 0) return null;

  return (
    <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
        Recados do seu consultor
      </h2>
      <ul className="space-y-3">
        {recados.map((r) => (
          <li key={r.id} className="text-sm">
            <p className="text-slate-700 dark:text-slate-200">{r.mensagem}</p>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              {formatData(r.criado_em)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
