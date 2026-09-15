import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import {
  getClientePorId,
  listarPosicoesDoCliente,
  consolidarPosicoes,
  listarProventosDoCliente,
  totalProventosDoCliente,
} from "@/lib/repo";
import { sincronizarProventosAutomaticos } from "@/lib/proventos-auto";
import ProventosSection from "@/components/ProventosSection";
import AreaEmConstrucao from "@/components/AreaEmConstrucao";
import { PROVENTOS_HABILITADO } from "@/lib/feature-flags";

export default async function MeusProventosPage() {
  const sessao = await getSessao();
  if (!sessao?.clienteId) redirect("/login");
  const cliente = getClientePorId(sessao.clienteId);
  if (!cliente) redirect("/login");

  if (!PROVENTOS_HABILITADO) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-black dark:text-white">Proventos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dividendos, JCP e rendimentos recebidos na sua carteira.
          </p>
        </div>
        <AreaEmConstrucao titulo="Proventos" icone="💰" />
      </div>
    );
  }

  // Best effort, mesmo espírito do resto do app: se a busca automática
  // falhar (sem internet, ticker sem dado etc.) a tela segue com o que já
  // estava lançado — nunca derruba a página por causa disso. Diferente da
  // carteira/da tela do consultor (onde isso roda em segundo plano pra não
  // atrasar o carregamento de outras coisas), aqui SIM esperamos terminar —
  // essa página inteira É a lista de proventos, então vale a pena esperar
  // pra já mostrar o dado mais novo, em vez do cliente ter que recarregar.
  try {
    await sincronizarProventosAutomaticos(
      cliente.id,
      consolidarPosicoes(listarPosicoesDoCliente(cliente.id))
    );
  } catch (erro) {
    console.error("Erro sincronizando proventos automáticos", erro);
  }

  const proventos = listarProventosDoCliente(cliente.id);
  const totalProventos = totalProventosDoCliente(cliente.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-black dark:text-white">Proventos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Dividendos, JCP e rendimentos recebidos na sua carteira.
        </p>
      </div>

      <ProventosSection
        clienteId={cliente.id}
        proventosIniciais={proventos}
        totalInicial={totalProventos}
      />
    </div>
  );
}
