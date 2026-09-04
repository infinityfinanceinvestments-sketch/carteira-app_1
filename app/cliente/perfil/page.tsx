import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { getClientePorId, getCarteiraModeloPorId } from "@/lib/repo";

const PERFIL_LABEL: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const PERFIL_DESCRICAO: Record<string, string> = {
  conservador:
    "Prioriza preservação de capital e baixa volatilidade, mesmo com retornos mais modestos.",
  moderado:
    "Aceita alguma volatilidade em busca de retorno acima da renda fixa tradicional, mantendo diversificação.",
  arrojado:
    "Tolera maior volatilidade e concentração em ativos de risco em busca de retorno no longo prazo.",
};

export default async function PerfilPage() {
  const sessao = await getSessao();
  if (!sessao?.clienteId) redirect("/login");
  const cliente = getClientePorId(sessao.clienteId);
  if (!cliente) redirect("/login");
  const carteiraModelo = cliente.carteira_modelo_id
    ? getCarteiraModeloPorId(cliente.carteira_modelo_id)
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-black dark:text-white">Meu perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Perfil de investidor (suitability) definido com seu consultor.
        </p>
      </div>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-xs text-slate-500 dark:text-slate-400">Perfil de risco</p>
        <p className="text-lg font-semibold text-black dark:text-white">
          {PERFIL_LABEL[cliente.perfil_risco]}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {PERFIL_DESCRICAO[cliente.perfil_risco]}
        </p>
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-xs text-slate-500 dark:text-slate-400">Dados de contato</p>
        <p className="text-sm text-slate-800 dark:text-slate-100">{cliente.nome}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{cliente.email}</p>
      </section>

      {cliente.objetivo && (
        <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400">Objetivo financeiro</p>
          <p className="text-sm text-slate-800 dark:text-slate-100">{cliente.objetivo}</p>
        </section>
      )}

      {carteiraModelo && (
        <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400">Carteira-modelo de referência</p>
          <p className="text-sm text-slate-800 dark:text-slate-100">{carteiraModelo.nome}</p>
        </section>
      )}

      <p className="rounded-xl bg-slate-100 dark:bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Seu perfil é revisado periodicamente pelo consultor. Caso sua situação
        financeira ou seus objetivos tenham mudado, entre em contato para
        atualizá-lo.
      </p>
    </div>
  );
}
