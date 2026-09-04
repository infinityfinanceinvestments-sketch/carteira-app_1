import { listarCarteirasModelo } from "@/lib/repo";
import NovoClienteForm from "@/components/NovoClienteForm";

export default async function NovoClientePage() {
  const carteirasModelo = listarCarteirasModelo();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-black dark:text-white">Novo cliente</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cadastro cria também o acesso do cliente ao app.
        </p>
      </div>
      <NovoClienteForm carteirasModelo={carteirasModelo} />
    </div>
  );
}
