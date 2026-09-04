"use client";

import { useMemo, useState } from "react";
import ProventosMensalChart from "./ProventosMensalChart";

type TipoProvento = "dividendo" | "jcp" | "rendimento";

interface Provento {
  id: number;
  ativo: string;
  tipo: TipoProvento;
  valor: number;
  data_pagamento: string;
}

const ROTULO_TIPO: Record<TipoProvento, string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento: "Rendimento",
};

type FiltroPeriodo = "todos" | "1m" | "3m" | "6m" | "1a";

const OPCOES_PERIODO: { valor: FiltroPeriodo; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todo período" },
  { valor: "1m", rotulo: "Último mês" },
  { valor: "3m", rotulo: "Últimos 3 meses" },
  { valor: "6m", rotulo: "Últimos 6 meses" },
  { valor: "1a", rotulo: "Último 1 ano" },
];

const MESES_POR_PERIODO: Record<Exclude<FiltroPeriodo, "todos">, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "1a": 12,
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatData = (iso: string) => {
  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
};

function dataDentroDoPeriodo(dataIso: string, periodo: FiltroPeriodo): boolean {
  if (periodo === "todos") return true;
  const limite = new Date();
  limite.setMonth(limite.getMonth() - MESES_POR_PERIODO[periodo]);
  const dataProvento = new Date(`${dataIso}T00:00:00`);
  return dataProvento >= limite;
}

const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const NOMES_MES_CURTO = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2026-09-14" -> "2026-09" */
function chaveMes(dataIso: string): string {
  return dataIso.slice(0, 7);
}

/** "2026-09" -> "Setembro de 2026" */
function rotuloMesExtenso(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave;
  return `${NOMES_MES[mes - 1]} de ${ano}`;
}

/** "2026-09" -> "set/26" (pro eixo do gráfico) */
function rotuloMesCurto(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave;
  return `${NOMES_MES_CURTO[mes - 1]}/${String(ano).slice(2)}`;
}

interface GrupoMesProventos {
  chave: string;
  rotulo: string;
  itens: Provento[];
  total: number;
}

export default function ProventosSection({
  clienteId,
  proventosIniciais,
  totalInicial,
  posicoes,
  podeEditar = false,
}: {
  clienteId: number;
  proventosIniciais: Provento[];
  totalInicial: number;
  posicoes?: { ativo: string }[];
  podeEditar?: boolean;
}) {
  const [proventos, setProventos] = useState(proventosIniciais);
  const [total, setTotal] = useState(totalInicial);
  const [ativo, setAtivo] = useState("");
  const [tipo, setTipo] = useState<TipoProvento>("dividendo");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [menuAberto, setMenuAberto] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todos");

  const ativosSugeridos = posicoes ? Array.from(new Set(posicoes.map((p) => p.ativo))) : [];

  const empresasComProvento = useMemo(
    () => Array.from(new Set(proventos.map((p) => p.ativo))).sort(),
    [proventos]
  );

  const proventosFiltrados = useMemo(
    () =>
      proventos.filter(
        (p) =>
          (filtroAtivo === "" || p.ativo === filtroAtivo) &&
          dataDentroDoPeriodo(p.data_pagamento, filtroPeriodo)
      ),
    [proventos, filtroAtivo, filtroPeriodo]
  );

  const totalFiltrado = useMemo(
    () => proventosFiltrados.reduce((soma, p) => soma + p.valor, 0),
    [proventosFiltrados]
  );

  const filtroLigado = filtroAtivo !== "" || filtroPeriodo !== "todos";

  // proventosFiltrados já vem ordenado do mais recente pro mais antigo (herdado
  // de `proventos`), então o primeiro provento de cada mês que aparece já
  // define a ordem dos grupos: mês mais recente primeiro.
  const gruposPorMes = useMemo(() => {
    const mapa = new Map<string, Provento[]>();
    for (const p of proventosFiltrados) {
      const chave = chaveMes(p.data_pagamento);
      const grupo = mapa.get(chave);
      if (grupo) grupo.push(p);
      else mapa.set(chave, [p]);
    }
    return Array.from(mapa.entries()).map(([chave, itens]) => ({
      chave,
      rotulo: rotuloMesExtenso(chave),
      itens,
      total: itens.reduce((soma, p) => soma + p.valor, 0),
    })) satisfies GrupoMesProventos[];
  }, [proventosFiltrados]);

  const mesAtualChave = useMemo(() => chaveMes(new Date().toISOString().slice(0, 10)), []);
  const totalMesAtual = gruposPorMes.find((g) => g.chave === mesAtualChave)?.total ?? 0;
  const mediaMensal = gruposPorMes.length > 0 ? totalFiltrado / gruposPorMes.length : 0;

  const dadosGrafico = useMemo(
    () =>
      [...gruposPorMes]
        .slice(0, 12)
        .reverse()
        .map((g) => ({ mes: rotuloMesCurto(g.chave), total: g.total })),
    [gruposPorMes]
  );

  // Por padrão só os 2 meses mais recentes vêm expandidos — o resto fica
  // recolhido até o usuário clicar. Quando o filtro muda, volta pro padrão
  // (ajuste de estado durante a renderização, sem useEffect — mesmo padrão
  // recomendado pelo React pra "resetar estado quando uma prop muda").
  const filtroChave = `${filtroAtivo}|${filtroPeriodo}`;
  const [ultimoFiltroChave, setUltimoFiltroChave] = useState(filtroChave);
  const [mesesExpandidosManual, setMesesExpandidosManual] = useState<Set<string> | null>(null);
  if (filtroChave !== ultimoFiltroChave) {
    setUltimoFiltroChave(filtroChave);
    setMesesExpandidosManual(null);
  }
  const mesesExpandidos =
    mesesExpandidosManual ?? new Set(gruposPorMes.slice(0, 2).map((g) => g.chave));

  function alternarMes(chave: string) {
    const novo = new Set(mesesExpandidos);
    if (novo.has(chave)) novo.delete(chave);
    else novo.add(chave);
    setMesesExpandidosManual(novo);
  }

  function limparFiltros() {
    setFiltroAtivo("");
    setFiltroPeriodo("todos");
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const valorNumerico = Number(valor.replace(",", "."));
    if (!ativo.trim() || !Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro("Preencha o ativo e um valor válido.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/proventos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ativo: ativo.trim().toUpperCase(),
          tipo,
          valor: valorNumerico,
          data_pagamento: data,
        }),
      });
      const respData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(respData.erro ?? "Não foi possível registrar.");
        return;
      }
      const novo: Provento = {
        id: respData.proventoId,
        ativo: ativo.trim().toUpperCase(),
        tipo,
        valor: valorNumerico,
        data_pagamento: data,
      };
      setProventos((prev) =>
        [novo, ...prev].sort((a, b) => b.data_pagamento.localeCompare(a.data_pagamento))
      );
      setTotal((prev) => prev + valorNumerico);
      setAtivo("");
      setValor("");
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: number, valorRemovido: number) {
    setProventos((prev) => prev.filter((p) => p.id !== id));
    setTotal((prev) => prev - valorRemovido);
    try {
      await fetch(`/api/clientes/${clienteId}/proventos/${id}`, { method: "DELETE" });
    } catch {
      // se falhar, o provento volta a aparecer no próximo carregamento da página
    }
  }

  return (
    <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Proventos recebidos</h2>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-emerald-700">
            {formatBRL(filtroLigado ? totalFiltrado : total)}
          </p>
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label="Filtrar proventos"
            aria-expanded={menuAberto}
            className={`relative rounded-xl border px-2 py-1.5 text-xs leading-none ${
              filtroLigado
                ? "border-[var(--color-navy-950)] text-[var(--color-navy-950)]"
                : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400"
            }`}
          >
            ☰
            {filtroLigado && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>
      </div>

      {menuAberto && (
        <div className="mb-3 space-y-3 rounded-xl bg-slate-50 dark:bg-white/5 p-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Empresa / ativo</p>
            <select
              value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
            >
              <option value="">Todas as empresas</option>
              {empresasComProvento.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Período</p>
            <div className="flex flex-wrap gap-1.5">
              {OPCOES_PERIODO.map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => setFiltroPeriodo(op.valor)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    filtroPeriodo === op.valor
                      ? "border-[var(--color-navy-950)] bg-[var(--color-navy-950)] text-white"
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {op.rotulo}
                </button>
              ))}
            </div>
          </div>
          {filtroLigado && (
            <button
              type="button"
              onClick={limparFiltros}
              className="text-xs font-medium text-slate-400 dark:text-slate-500 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {podeEditar && (
        <form
          onSubmit={adicionar}
          className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-white/5 p-3"
        >
          <input
            list="ativos-cliente-proventos"
            value={ativo}
            onChange={(e) => setAtivo(e.target.value)}
            placeholder="Ativo"
            className="col-span-2 rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs uppercase sm:col-span-1"
          />
          {ativosSugeridos.length > 0 && (
            <datalist id="ativos-cliente-proventos">
              {ativosSugeridos.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          )}
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoProvento)}
            className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
          >
            <option value="dividendo">Dividendo</option>
            <option value="jcp">JCP</option>
            <option value="rendimento">Rendimento</option>
          </select>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Valor (R$)"
            inputMode="decimal"
            className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
          />
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={enviando}
            className="rounded-xl btn-accent px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {enviando ? "..." : "Lançar"}
          </button>
        </form>
      )}
      {erro && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>
      )}

      {proventosFiltrados.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {proventos.length === 0
            ? "Nenhum provento registrado ainda."
            : "Nenhum provento encontrado para esse filtro."}
        </p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {filtroLigado ? "Total no filtro" : "Total recebido"}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-700">
                {formatBRL(totalFiltrado)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Este mês</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {formatBRL(totalMesAtual)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Média mensal</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {formatBRL(mediaMensal)}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-xl bg-slate-50/60 dark:bg-white/5 p-2">
            <ProventosMensalChart dados={dadosGrafico} />
          </div>

          <div className="space-y-2">
            {gruposPorMes.map((grupo) => {
              const expandido = mesesExpandidos.has(grupo.chave);
              return (
                <div key={grupo.chave} className="rounded-xl border border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => alternarMes(grupo.chave)}
                    aria-expanded={expandido}
                    className="flex w-full items-center justify-between px-3 py-2 text-left"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                      <span
                        className={`inline-block transition-transform ${expandido ? "rotate-90" : ""}`}
                      >
                        ›
                      </span>
                      {grupo.rotulo}
                      <span className="text-slate-400 dark:text-slate-500">
                        · {grupo.itens.length} {grupo.itens.length === 1 ? "lançamento" : "lançamentos"}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {formatBRL(grupo.total)}
                    </span>
                  </button>
                  {expandido && (
                    <ul className="divide-y divide-slate-100 dark:divide-white/10 border-t border-slate-100 dark:border-white/5 px-3">
                      {grupo.itens.map((p) => (
                        <li key={p.id} className="flex items-center justify-between py-2 text-xs">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {p.ativo} · {ROTULO_TIPO[p.tipo]}
                            </p>
                            <p className="text-slate-400 dark:text-slate-500">{formatData(p.data_pagamento)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{formatBRL(p.valor)}</p>
                            {podeEditar && (
                              <button
                                type="button"
                                onClick={() => remover(p.id, p.valor)}
                                className="text-slate-300 dark:text-slate-600 hover:text-red-500"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
