import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { getClientePorId, listarObjetivosComProgresso } from "@/lib/repo";
import ObjetivosSection from "@/components/ObjetivosSection";

export default async function MeusObjetivosPage() {
  const sessao = await getSessao();
  if (!sessao?.clienteId) redirect("/login");
  const cliente = getClientePorId(sessao.clienteId);
  if (!cliente) redirect("/login");

  const objetivos = listarObjetivosComProgresso(cliente.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-black dark:text-white">Objetivos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Metas traçadas com o seu consultor, com o progresso atualizado automaticamente.
        </p>
      </div>

      <ObjetivosSection clienteId={cliente.id} objetivosIniciais={objetivos} />
    </div>
  );
}
