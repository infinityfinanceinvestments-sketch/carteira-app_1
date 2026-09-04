import Link from "next/link";
import { listarClientes, valorTotalCarteira } from "@/lib/repo";
import ListaClientes from "@/components/ListaClientes";

export default async function ClientesPage() {
  const clientes = listarClientes().map((c) => ({
    id: c.id,
    nome: c.nome,
    email: c.email,
    perfil_risco: c.perfil_risco,
    valorTotal: valorTotalCarteira(c.id),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-black dark:text-white">Clientes</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/consultor/comparativo"
            className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            Comparativo
          </Link>
          <Link
            href="/consultor/clientes/novo"
            className="rounded-xl btn-accent px-3 py-1.5 text-xs font-semibold text-white"
          >
            + Novo
          </Link>
        </div>
      </div>

      <ListaClientes clientes={clientes} />
    </div>
  );
}
