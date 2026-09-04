import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClientePorId,
  getSolicitacaoPendenteDoCliente,
  listarPosicoesDoCliente,
  consolidarPosicoes,
  alocacaoPorClasse,
  desvioVsCarteiraModelo,
  listarRecomendacoesDoCliente,
  listarCarteirasModelo,
  listarAuditoriaDoCliente,
  listarProventosDoCliente,
  totalProventosDoCliente,
  valorTotalCarteira,
  listarObjetivosComProgresso,
} from "@/lib/repo";
import { garantirSnapshotDeHoje, obterHistoricoComBenchmark } from "@/lib/rentabilidade";
import { sincronizarProventosAutomaticos } from "@/lib/proventos-auto";
import AllocationDonut from "@/components/AllocationDonut";
import DeviationChart from "@/components/DeviationChart";
import EvolutionChart from "@/components/EvolutionChart";
import StatusBadge from "@/components/StatusBadge";
import RecomendacaoForm from "@/components/RecomendacaoForm";
import RecomendacaoAcoes from "@/components/RecomendacaoAcoes";
import LimparRecomendacoesAceitas from "@/components/LimparRecomendacoesAceitas";
import ModeloSelector from "@/components/ModeloSelector";
import GerarLinkRedefinicao from "@/components/GerarLinkRedefinicao";
import ProventosSection from "@/components/ProventosSection";
import ObjetivosSection from "@/components/ObjetivosSection";
import { formatDataHoraBr } from "@/lib/formatacao";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PERFIL_LABEL: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clienteId = Number(id);
  const cliente = getClientePorId(clienteId);
  if (!cliente) notFound();

  const posicoes = consolidarPosicoes(listarPosicoesDoCliente(clienteId));
  const alocacao = alocacaoPorClasse(clienteId);
  const desvio = desvioVsCarteiraModelo(clienteId);
  const recomendacoes = listarRecomendacoesDoCliente(clienteId);
  const aceitas = recomendacoes.filter(
    (r) => r.status === "aceita" || r.status === "expirada"
  ).length;
  const solicitacaoPendente = getSolicitacaoPendenteDoCliente(clienteId) ?? null;
  const carteirasModelo = listarCarteirasModelo();
  const total = valorTotalCarteira(clienteId);
  const auditoria = listarAuditoriaDoCliente(clienteId);
  // Fire-and-forget: não trava o carregamento da página esperando as
  // chamadas na Yahoo Finance terminarem (best effort, ver lib/proventos-auto.ts).
  sincronizarProventosAutomaticos(clienteId, posicoes).catch((erro) => {
    console.error("Erro sincronizando proventos automáticos", erro);
  });
  const proventos = listarProventosDoCliente(clienteId);
  const totalProventos = totalProventosDoCliente(clienteId);
  const objetivos = listarObjetivosComProgresso(clienteId);

  garantirSnapshotDeHoje(clienteId, total);
  const historico = await obterHistoricoComBenchmark(clienteId, cliente.benchmark);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/consultor/clientes" className="text-xs text-slate-400 dark:text-slate-500">
            ← Clientes
          </Link>
          <h1 className="text-lg font-semibold text-black dark:text-white">{cliente.nome}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {PERFIL_LABEL[cliente.perfil_risco]} · {cliente.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Link
            href={`/consultor/importar?clienteId=${clienteId}`}
            className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Importar CSV
          </Link>
          <a
            href={`/api/clientes/${clienteId}/relatorio`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Relatório PDF
          </a>
        </div>
      </div>

      <GerarLinkRedefinicao usuarioId={cliente.usuario_id} nomeCliente={cliente.nome} />

      {cliente.objetivo && (
        <p className="rounded-xl bg-white dark:bg-[var(--color-navy-900)] p-3 text-xs text-slate-500 dark:text-slate-400 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          Objetivo: {cliente.objetivo}
        </p>
      )}

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-xs text-slate-500 dark:text-slate-400">Patrimônio atual</p>
        <p className="text-2xl font-semibold text-black dark:text-white">{formatBRL(total)}</p>
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Evolução patrimonial
        </h2>
        <EvolutionChart dados={historico} benchmarkLabel={cliente.benchmark} />
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Alocação por classe de ativo
        </h2>
        <AllocationDonut dados={alocacao} />
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Comparação com carteira-modelo
          </h2>
          <ModeloSelector
            clienteId={clienteId}
            carteiraModeloId={cliente.carteira_modelo_id}
            opcoes={carteirasModelo}
          />
        </div>
        <DeviationChart dados={desvio} />
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Posições</h2>
        {posicoes.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Nenhuma posição cadastrada. Use “Importar CSV” para carregar a carteira.
          </p>
        ) : (
          <div className="scroll-x -mx-1">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="text-slate-400 dark:text-slate-500">
                  <th className="px-1 py-1.5 font-medium">Ativo</th>
                  <th className="px-1 py-1.5 font-medium">Classe</th>
                  <th className="px-1 py-1.5 font-medium">Qtd.</th>
                  <th className="px-1 py-1.5 text-right font-medium">Valor atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {posicoes.map((p) => (
                  <tr key={p.id}>
                    <td className="px-1 py-1.5 font-medium text-slate-800 dark:text-slate-100">
                      {p.ativo}
                    </td>
                    <td className="px-1 py-1.5 text-slate-500 dark:text-slate-400">{p.classe}</td>
                    <td className="px-1 py-1.5 text-slate-500 dark:text-slate-400">{p.quantidade}</td>
                    <td className="px-1 py-1.5 text-right text-slate-800 dark:text-slate-100">
                      {formatBRL(p.valor_atual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recomendações</h2>
          <LimparRecomendacoesAceitas clienteId={clienteId} quantidade={aceitas} />
        </div>
        {solicitacaoPendente && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-100">
            <p className="font-medium">
              🔔 {cliente.nome} pediu uma recomendação em{" "}
              {new Date(solicitacaoPendente.criado_em).toLocaleDateString("pt-BR")}
            </p>
            {solicitacaoPendente.mensagem && (
              <p className="mt-1 italic">&ldquo;{solicitacaoPendente.mensagem}&rdquo;</p>
            )}
            <p className="mt-1 text-amber-700">
              Criar uma recomendação nova pra ele abaixo já marca esse pedido como
              respondido.
            </p>
          </div>
        )}
        <RecomendacaoForm clienteId={clienteId} />
        <ul className="space-y-2">
          {recomendacoes.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-100 dark:border-white/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {r.ativo} · {r.classe}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {r.tipo_operacao} · {new Date(r.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">{r.justificativa}</p>
              <RecomendacaoAcoes recomendacaoId={r.id} papel="consultor" />
            </li>
          ))}
          {recomendacoes.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma recomendação registrada.</p>
          )}
        </ul>
      </section>

      <ProventosSection
        clienteId={clienteId}
        proventosIniciais={proventos}
        totalInicial={totalProventos}
        posicoes={posicoes}
        podeEditar
      />

      <ObjetivosSection clienteId={clienteId} objetivosIniciais={objetivos} podeEditar />

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Histórico de alterações
        </h2>
        {auditoria.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {auditoria.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate-100 dark:border-white/5 p-2.5 text-xs">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {a.acao === "importacao_b3"
                    ? "Importação de extrato B3"
                    : a.acao === "importacao_manual"
                    ? "Importação manual de posições"
                    : a.acao}
                </p>
                <p className="text-slate-400 dark:text-slate-500">
                  {formatDataHoraBr(a.criado_em)}
                  {a.usuario_nome ? ` · ${a.usuario_nome}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
