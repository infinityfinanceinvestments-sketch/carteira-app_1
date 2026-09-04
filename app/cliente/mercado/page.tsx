import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { getClientePorId, listarFavoritosDoCliente } from "@/lib/repo";
import MercadoAoVivo from "@/components/MercadoAoVivo";

export default async function MercadoPage() {
  const sessao = await getSessao();
  if (!sessao?.clienteId) redirect("/login");
  const cliente = getClientePorId(sessao.clienteId);
  if (!cliente) redirect("/login");

  const favoritos = listarFavoritosDoCliente(cliente.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-black dark:text-white">Mercado ao vivo</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Acompanhe a cotação dos ativos que você quiser e as taxas de juros
          do dia.
        </p>
      </div>
      <MercadoAoVivo
        clienteId={cliente.id}
        favoritosIniciais={favoritos.map((f) => f.ticker)}
      />
    </div>
  );
}
