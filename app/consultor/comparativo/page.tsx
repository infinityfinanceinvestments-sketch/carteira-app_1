import Link from "next/link";
import { listarClientes, valorTotalCarteira, listarHistoricoPatrimonio } from "@/lib/repo";
import ComparativoClientes from "@/components/ComparativoClientes";

export default async function ComparativoPage() {
  const clientes = listarClientes().map((c) => {
    const historico = listarHistoricoPatrimonio(c.id);
    let rentabilidadePercentual: number | null = null;
    if (historico.length >= 2) {
      const primeiro = historico[0].valor_total;
      const ultimo = historico[historico.length - 1].valor_total;
      if (primeiro !== 0) {
        rentabilidadePercentual = ((ultimo - primeiro) / primeiro) * 100;
      }
    }
    return {
      id: c.id,
      nome: c.nome,
      perfil_risco: c.perfil_risco,
      benchmark: c.benchmark,
      valorTotal: valorTotalCarteira(c.id),
      rentabilidadePercentual,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link href="/consultor/clientes" className="text-xs text-slate-500 dark:text-slate-400 hover:underline">
            ← Clientes
          </Link>
          <h1 className="text-lg font-semibold text-black dark:text-white">Visão comparativa</h1>
        </div>
        <a
          href="/api/relatorio-consolidado"
          className="shrink-0 rounded-xl btn-accent px-3 py-1.5 text-xs font-semibold text-white"
        >
          Exportar PDF
        </a>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Rentabilidade é calculada entre o primeiro e o último ponto do histórico de patrimônio
        de cada cliente — sem histórico suficiente, aparece como &quot;—&quot;.
      </p>

      <ComparativoClientes clientes={clientes} />
    </div>
  );
}
