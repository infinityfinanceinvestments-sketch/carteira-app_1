import Link from "next/link";
import { listarCarteirasModelo, listarAlocacoesAlvo } from "@/lib/repo";

export default async function CarteirasModeloPage() {
  const carteiras = listarCarteirasModelo();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-black dark:text-white">Carteiras-modelo</h1>
        <Link
          href="/consultor/carteiras-modelo/novo"
          className="rounded-xl btn-accent px-3 py-1.5 text-xs font-semibold text-white"
        >
          + Nova
        </Link>
      </div>

      {carteiras.length === 0 ? (
        <p className="rounded-3xl card-sheen p-6 text-center text-sm text-slate-400 dark:text-slate-500 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          Nenhuma carteira-modelo cadastrada ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {carteiras.map((c) => {
            const alocacoes = listarAlocacoesAlvo(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/consultor/carteiras-modelo/${c.id}`}
                  className="block rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10"
                >
                  <p className="text-sm font-medium text-black dark:text-white">{c.nome}</p>
                  {c.descricao && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.descricao}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {alocacoes.length} classe(s) alocada(s)
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
