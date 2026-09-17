import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import {
  getClientePorId,
  listarPosicoesDoCliente,
  consolidarPosicoes,
  alocacaoPorClasse,
  valorTotalCarteira,
  listarPontosIntradayDeHoje,
  listarMovimentacoesDoCliente,
} from "@/lib/repo";
import { garantirSnapshotDeHoje, obterHistoricoComTodosBenchmarks } from "@/lib/rentabilidade";
import { atualizarRendaFixaIndexada } from "@/lib/rendaFixaIndexada";
import { atualizarPrecosDeMercado } from "@/lib/cotacoes";
import { registrarSnapshotIntraday } from "@/lib/intraday";
import type { Indicador } from "@/lib/indices";
import AlocacaoView from "@/components/AlocacaoView";
import EvolutionChart from "@/components/EvolutionChart";
import InformarMovimentacao from "@/components/InformarMovimentacao";
import PosicoesAgrupadas from "@/components/PosicoesAgrupadas";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function MinhaCarteiraPage() {
  const sessao = await getSessao();
  if (!sessao?.clienteId) redirect("/login");
  const cliente = getClientePorId(sessao.clienteId);
  if (!cliente) redirect("/login");

  // Antes de montar a tela, atualiza a cotação de mercado de ações/FIIs/ETFs
  // (pra rentabilidade da carteira refletir o preço real de hoje, não o
  // valor de quando a posição foi importada/lançada) e rende as posições de
  // Renda Fixa indexadas ao CDI — as duas são "best effort" e nunca
  // derrubam a página por causa disso.
  try {
    await atualizarPrecosDeMercado(listarPosicoesDoCliente(cliente.id));
  } catch (erro) {
    console.error("Erro atualizando cotações de mercado", erro);
  }
  try {
    await atualizarRendaFixaIndexada(listarPosicoesDoCliente(cliente.id));
  } catch (erro) {
    console.error("Erro atualizando renda fixa indexada", erro);
  }

  const posicoes = consolidarPosicoes(listarPosicoesDoCliente(cliente.id));
  const alocacao = alocacaoPorClasse(cliente.id);
  const total = valorTotalCarteira(cliente.id);

  garantirSnapshotDeHoje(cliente.id, total);
  registrarSnapshotIntraday(cliente.id, total);
  const historico = await obterHistoricoComTodosBenchmarks(cliente.id);
  const intraday = listarPontosIntradayDeHoje(cliente.id);
  const movimentacoes = listarMovimentacoesDoCliente(cliente.id);

  const primeiro = historico[0]?.valor_total ?? total;
  const variacao = primeiro > 0 ? ((total - primeiro) / primeiro) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-black dark:text-white">Minha carteira</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Benchmark de referência: {cliente.benchmark}
          </p>
        </div>
        <a
          href={`/api/clientes/${cliente.id}/relatorio`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          Relatório PDF
        </a>
      </div>

      <section className="hero-organic rounded-[28px] p-5 text-white">
        <p className="text-xs text-white/60">Patrimônio atual</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{formatBRL(total)}</p>
        {historico.length > 1 && (
          <p
            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              variacao >= 0
                ? "bg-emerald-400/15 text-emerald-300"
                : "bg-red-400/15 text-red-300"
            }`}
          >
            {variacao >= 0 ? "+" : ""}
            {variacao.toFixed(1)}% desde o início do acompanhamento
          </p>
        )}
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Evolução</h2>
        <EvolutionChart
          dados={historico}
          intraday={intraday}
          benchmarkPadrao={cliente.benchmark as Indicador}
        />
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Alocação por classe de ativo
        </h2>
        <AlocacaoView alocacao={alocacao} posicoes={posicoes} />
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Posições</h2>
          {posicoes.length > 0 && (
            <a
              href={`/api/clientes/${cliente.id}/posicoes/exportar-csv`}
              className="shrink-0 rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Exportar CSV
            </a>
          )}
        </div>
        <PosicoesAgrupadas posicoes={posicoes} />
      </section>

      <InformarMovimentacao
        clienteId={cliente.id}
        posicoes={posicoes.map((p) => ({ id: p.id, ativo: p.ativo, classe: p.classe }))}
        movimentacoes={movimentacoes}
      />
    </div>
  );
}
