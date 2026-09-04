import { listarClientes } from "@/lib/repo";
import ImportarForm from "@/components/ImportarForm";

export default async function ImportarPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { clienteId } = await searchParams;
  const clientes = listarClientes();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-black dark:text-white">Importar posições</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Carregue o extrato exportado direto do Portal do Investidor da B3
          (recomendado) ou um CSV simples, enquanto a integração automática
          via Open Finance não está conectada para este cliente.
        </p>
      </div>
      <ImportarForm
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
        clienteIdInicial={clienteId ? Number(clienteId) : undefined}
      />
    </div>
  );
}
