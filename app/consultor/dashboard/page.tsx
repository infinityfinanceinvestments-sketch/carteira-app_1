import Link from "next/link";
import { getSessao } from "@/lib/auth";
import {
  listarClientes,
  valorTotalCarteira,
  listarTodasRecomendacoesPendentes,
  listarTodasMovimentacoesPendentes,
  desvioVsCarteiraModelo,
  listarRecadosDoConsultor,
} from "@/lib/repo";
import StatusBadge from "@/components/StatusBadge";
import RecadosConsultor from "@/components/RecadosConsultor";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function DashboardPage() {
  const sessao = await getSessao();
  const clientes = listarClientes();
  const patrimonios = clientes.map((c) => ({
    cliente: c,
    total: valorTotalCarteira(c.id),
  }));
  const patrimonioTotal = patrimonios.reduce((acc, p) => acc + p.total, 0);
  const pendentes = listarTodasRecomendacoesPendentes();
  const movimentacoesPendentes = listarTodasMovimentacoesPendentes();

  const desvios = clientes
    .map((c) => {
      const d = desvioVsCarteiraModelo(c.id);
      const maiorDesvio = d.reduce(
        (max, item) => (Math.abs(item.desvio) > Math.abs(max) ? item.desvio : max),
        0
      );
      return { cliente: c, maiorDesvio };
    })
    .filter((d) => Math.abs(d.maiorDesvio) >= 5)
    .sort((a, b) => Math.abs(b.maiorDesvio) - Math.abs(a.maiorDesvio))
    .slice(0, 3);

  const recados = sessao ? listarRecadosDoConsultor(sessao.userId) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-black dark:text-white">Visão geral</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Resumo consolidado da carteira dos seus clientes.
        </p>
      </div>

      <div className="hero-organic rounded-[28px] p-5 text-white">
        <p className="text-xs text-white/60">Patrimônio sob acompanhamento</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          {formatBRL(patrimonioTotal)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"} acompanhados
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400">Recomendações pendentes</p>
          <p className="mt-1 text-lg font-semibold text-black dark:text-white">
            {pendentes.length}
          </p>
        </div>
        <div className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400">Aportes/retiradas a validar</p>
          <p className="mt-1 text-lg font-semibold text-black dark:text-white">
            {movimentacoesPendentes.length}
          </p>
        </div>
      </div>

      <Link
        href="/consultor/clientes/novo"
        className="btn-accent flex flex-col justify-center rounded-3xl p-4 text-white"
      >
        <p className="text-sm font-semibold">+ Novo cliente</p>
        <p className="text-xs text-white/70">Cadastrar agora</p>
      </Link>

      <RecadosConsultor recados={recados} />

      {movimentacoesPendentes.length > 0 && (
        <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-amber-200 dark:ring-amber-500/30">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              🔔 Aportes/retiradas aguardando validação
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {movimentacoesPendentes.length}
            </span>
          </div>
          <ul className="space-y-2">
            {movimentacoesPendentes.slice(0, 6).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/consultor/clientes/${m.cliente_id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    {m.cliente_nome} · {m.tipo === "aporte" ? "Aporte" : "Retirada"} em{" "}
                    {m.ativo}
                  </span>
                  <span className="text-sm font-medium text-black dark:text-white">
                    {formatBRL(m.valor)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {desvios.length > 0 && (
        <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Maiores desvios da carteira-modelo
          </h2>
          <ul className="space-y-2">
            {desvios.map(({ cliente, maiorDesvio }) => (
              <li key={cliente.id}>
                <Link
                  href={`/consultor/clientes/${cliente.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-200">{cliente.nome}</span>
                  <span
                    className={`text-sm font-medium ${
                      maiorDesvio > 0 ? "text-amber-700 dark:text-amber-400" : "text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    {maiorDesvio > 0 ? "+" : ""}
                    {maiorDesvio.toFixed(1)} p.p.
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Recomendações aguardando resposta
          </h2>
          {pendentes.length > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">{pendentes.length}</span>
          )}
        </div>
        {pendentes.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma recomendação pendente.</p>
        ) : (
          <ul className="space-y-2">
            {pendentes.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/consultor/clientes/${r.cliente_id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    {r.cliente_nome} · {r.ativo}
                  </span>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clientes</h2>
          <Link
            href="/consultor/clientes"
            className="text-xs text-[var(--color-navy-700)] dark:text-[var(--color-sky)]"
          >
            Ver todos
          </Link>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {patrimonios.slice(0, 5).map(({ cliente, total }) => (
            <li key={cliente.id}>
              <Link
                href={`/consultor/clientes/${cliente.id}`}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm text-slate-700 dark:text-slate-200">{cliente.nome}</span>
                <span className="text-sm font-medium text-black dark:text-white">
                  {formatBRL(total)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
