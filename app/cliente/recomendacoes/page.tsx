import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import {
  getClientePorId,
  getSolicitacaoPendenteDoCliente,
  listarRecomendacoesDoCliente,
} from "@/lib/repo";
import StatusBadge from "@/components/StatusBadge";
import RecomendacaoAcoes from "@/components/RecomendacaoAcoes";
import LimparRecomendacoesAceitas from "@/components/LimparRecomendacoesAceitas";
import SolicitarRecomendacao from "@/components/SolicitarRecomendacao";
import Disclaimer from "@/components/Disclaimer";

export default async function RecomendacoesPage() {
  const sessao = await getSessao();
  if (!sessao?.clienteId) redirect("/login");
  const cliente = getClientePorId(sessao.clienteId);
  if (!cliente) redirect("/login");

  const recomendacoes = listarRecomendacoesDoCliente(cliente.id);
  const pendentes = recomendacoes.filter((r) =>
    ["pendente", "enviada"].includes(r.status)
  );
  const respondidas = recomendacoes.filter(
    (r) => !["pendente", "enviada"].includes(r.status)
  );
  const aceitas = recomendacoes.filter(
    (r) => r.status === "aceita" || r.status === "expirada"
  ).length;
  const solicitacaoPendente = getSolicitacaoPendenteDoCliente(cliente.id) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-black dark:text-white">Recomendações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enviadas pelo seu consultor com base no seu perfil e objetivos.
        </p>
      </div>

      <Disclaimer />

      <SolicitarRecomendacao clienteId={cliente.id} pendente={solicitacaoPendente} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Aguardando sua resposta
        </h2>
        {pendentes.length === 0 ? (
          <p className="rounded-3xl card-sheen p-4 text-sm text-slate-400 dark:text-slate-500 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
            Nenhuma recomendação pendente no momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendentes.map((r) => (
              <li
                key={r.id}
                className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {r.ativo} · {r.classe}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.tipo_operacao}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">{r.justificativa}</p>
                <RecomendacaoAcoes recomendacaoId={r.id} papel="cliente" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {respondidas.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Histórico</h2>
            <LimparRecomendacoesAceitas clienteId={cliente.id} quantidade={aceitas} />
          </div>
          <ul className="space-y-2">
            {respondidas.map((r) => (
              <li
                key={r.id}
                className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {r.ativo} · {r.classe}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(r.atualizado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
