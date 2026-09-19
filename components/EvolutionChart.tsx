"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatHoraBr } from "@/lib/formatacao";
import { INDICADORES_VALIDOS, LABEL_INDICADOR, type Indicador } from "@/lib/indicadores";
import VariacaoBadge, { formatPercent } from "@/components/VariacaoBadge";

export interface PontoEvolucao {
  data: string;
  valor_total: number;
  /** Valor de cada indicador (CDI/IPCA/Ibovespa/S&P 500) reescalado pra
   *  mesma escala em reais da carteira nesse ponto — ver
   *  obterHistoricoComTodosBenchmarks em lib/rentabilidade.ts. Indicador
   *  ausente ou null = não foi possível calcular esse ponto. */
  benchmarks: Partial<Record<Indicador, number | null>>;
}

// Ponto intraday (ver lib/intraday.ts) — só existe pro filtro "1D": um
// ponto por abertura de carteira ao longo do dia, sem resolução de
// benchmark (os índices de mercado só têm fechamento diário, não intraday).
export interface PontoIntraday {
  momento: string;
  valor_total: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatBRLCompact = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  });

const NOMES_MES = [
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

function formatMesAno(iso: string) {
  const [ano, mes] = iso.split("-");
  return `${NOMES_MES[Number(mes) - 1]}/${ano.slice(2)}`;
}

function formatDiaMes(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${Number(dia)} ${NOMES_MES[Number(mes) - 1]}`;
}

function formatDataCompleta(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

type Periodo = "1d" | "7d" | "30d" | "90d" | "6m" | "1a" | "tudo";
type Modo = "rentabilidade" | "patrimonio";

const OPCOES_PERIODO: { valor: Periodo; label: string; dias: number | null }[] = [
  { valor: "1d", label: "1D", dias: 1 },
  { valor: "7d", label: "7D", dias: 7 },
  { valor: "30d", label: "30D", dias: 30 },
  { valor: "90d", label: "90D", dias: 90 },
  { valor: "6m", label: "6M", dias: 182 },
  { valor: "1a", label: "1A", dias: 365 },
  { valor: "tudo", label: "Tudo", dias: null },
];

/** Filtra os pontos a partir da data mais recente do próprio histórico
 *  (não da data de hoje) — assim o filtro funciona mesmo em dados de
 *  demonstração com datas no passado. */
function filtrarPorPeriodo(dados: PontoEvolucao[], dias: number | null): PontoEvolucao[] {
  if (dias === null || dados.length === 0) return dados;
  const maisRecente = new Date(dados[dados.length - 1].data + "T00:00:00");
  const corte = new Date(maisRecente);
  corte.setDate(corte.getDate() - dias);
  return dados.filter((d) => new Date(d.data + "T00:00:00") >= corte);
}

/** <select> nativo estilizado como "pill" com setinha — o menu suspenso que
 *  abre continua sendo o <select> do navegador (já legível no modo escuro,
 *  ver `select option` em app/globals.css), só a caixa fechada que ganha a
 *  cara de botão arredondado em vez do retângulo padrão. */
function SeletorPill<T extends string>({
  value,
  onChange,
  options,
  minWidthClass,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { valor: T; label: string }[];
  minWidthClass?: string;
}) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`appearance-none rounded-full bg-slate-100 dark:bg-white/10 py-1.5 pl-3 pr-6 text-xs font-medium text-slate-600 dark:text-slate-300 outline-none ${minWidthClass ?? ""}`}
      >
        {options.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 dark:text-slate-500">
        ▾
      </span>
    </div>
  );
}

export default function EvolutionChart({
  dados,
  intraday,
  benchmarkPadrao,
}: {
  dados: PontoEvolucao[];
  /** Pontos de hoje pro filtro "1D" (ver lib/intraday.ts). Opcional — sem
   *  isso, "1D" só mostra a mensagem de "sem pontos suficientes". */
  intraday?: PontoIntraday[];
  /** Indicador selecionado de início no seletor de benchmark — normalmente
   *  o benchmark configurado no cadastro do cliente (cliente.benchmark).
   *  O cliente pode trocar pra qualquer um dos 4 na hora, sem recarregar
   *  nada, já que todos já vêm calculados em `dados`. */
  benchmarkPadrao?: Indicador;
}) {
  const [modo, setModo] = useState<Modo>("rentabilidade");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const [indicador, setIndicador] = useState<Indicador>(benchmarkPadrao ?? "CDI");
  // Índice do ponto clicado na linha de rentabilidade (pra mostrar "quanto a
  // carteira estava rendendo" naquela data específica) — null enquanto nada
  // foi clicado ainda. Reseta sempre que o período/indicador muda, porque o
  // índice não corresponde mais aos mesmos dados.
  const [pontoClicadoIdx, setPontoClicadoIdx] = useState<number | null>(null);
  const eIntraday = periodo === "1d";

  const dadosFiltrados = useMemo(() => {
    if (eIntraday) return [];
    const opcao = OPCOES_PERIODO.find((o) => o.valor === periodo);
    return filtrarPorPeriodo(dados, opcao?.dias ?? null);
  }, [dados, periodo, eIntraday]);

  const usarDiaMes = periodo === "7d" || periodo === "30d";

  // ---- série em reais (modo "Patrimônio", igual ao gráfico original) ----
  const formatadoReais = eIntraday
    ? (intraday ?? []).map((p) => ({
        valor_total: p.valor_total,
        valor_benchmark: null as number | null,
        label: formatHoraBr(p.momento),
      }))
    : dadosFiltrados.map((d) => ({
        valor_total: d.valor_total,
        valor_benchmark: d.benchmarks[indicador] ?? null,
        label: usarDiaMes ? formatDiaMes(d.data) : formatMesAno(d.data),
      }));

  // ---- série em percentual (modo "Rentabilidade") — tudo reescalado a
  // partir do primeiro ponto do período filtrado, pra "quanto rendeu desde
  // o início desse período" bater com o número em destaque acima do
  // gráfico, do jeito que apps de corretora mostram. ----
  const baseValor = eIntraday ? (intraday ?? [])[0]?.valor_total : dadosFiltrados[0]?.valor_total;
  const baseBenchmark = eIntraday ? null : dadosFiltrados[0]?.benchmarks[indicador] ?? null;

  const formatadoPercentual = eIntraday
    ? (intraday ?? []).map((p) => ({
        valor_total_pct: baseValor ? ((p.valor_total - baseValor) / baseValor) * 100 : 0,
        valor_benchmark_pct: null as number | null,
        label: formatHoraBr(p.momento),
      }))
    : dadosFiltrados.map((d) => {
        const vb = d.benchmarks[indicador];
        return {
          valor_total_pct: baseValor ? ((d.valor_total - baseValor) / baseValor) * 100 : 0,
          valor_benchmark_pct:
            baseBenchmark != null && vb != null ? ((vb - baseBenchmark) / baseBenchmark) * 100 : null,
          label: usarDiaMes ? formatDiaMes(d.data) : formatMesAno(d.data),
        };
      });

  const retornoCarteira =
    formatadoPercentual.length > 0
      ? formatadoPercentual[formatadoPercentual.length - 1].valor_total_pct
      : null;
  const retornoBenchmark = (() => {
    for (let i = formatadoPercentual.length - 1; i >= 0; i--) {
      const v = formatadoPercentual[i].valor_benchmark_pct;
      if (v != null) return v;
    }
    return null;
  })();
  // "X% do CDI": a rentabilidade da carteira como fração da rentabilidade
  // do benchmark no mesmo período (ex: carteira +15,5%, CDI +13,7% => 113%
  // do CDI) — só faz sentido exibir com um benchmark positivo de verdade.
  const percentualDoBenchmark =
    retornoCarteira != null && retornoBenchmark != null && retornoBenchmark > 0.001
      ? (retornoCarteira / retornoBenchmark) * 100
      : null;
  const ganhoAbsoluto =
    !eIntraday && dadosFiltrados.length > 0
      ? dadosFiltrados[dadosFiltrados.length - 1].valor_total - dadosFiltrados[0].valor_total
      : null;

  const semHistorico = !eIntraday && dados.length < 2;
  const dadosInsuficientes =
    modo === "rentabilidade" ? formatadoPercentual.length < 2 : formatadoReais.length < 2;

  // Ponto que o cliente clicou na linha de rentabilidade, se ainda válido
  // pro conjunto de dados atual (ver reset no onClick do período/modo).
  const pontoClicado =
    pontoClicadoIdx != null ? formatadoPercentual[pontoClicadoIdx] : undefined;

  // O tipo exato do evento de clique do recharts (CategoricalChartFunc) é
  // complicado de declarar aqui; só lemos o índice em runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function aoClicarNoGrafico(estado: any) {
    const idx = Number(estado?.activeTooltipIndex);
    if (Number.isInteger(idx)) {
      setPontoClicadoIdx(idx);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex gap-1">
        {(
          [
            { valor: "rentabilidade", label: "Rentabilidade" },
            { valor: "patrimonio", label: "Patrimônio" },
          ] as const
        ).map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => setModo(o.valor)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              modo === o.valor
                ? "bg-[var(--color-navy-950)] text-white"
                : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {modo === "rentabilidade" && !eIntraday && !semHistorico && dadosFiltrados.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Rentabilidade • De {formatDataCompleta(dadosFiltrados[0].data)} até{" "}
            {formatDataCompleta(dadosFiltrados[dadosFiltrados.length - 1].data)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {ganhoAbsoluto != null && (
              <span className="text-xl font-semibold text-black dark:text-white">
                {formatBRL(ganhoAbsoluto)}
              </span>
            )}
            <VariacaoBadge valor={retornoCarteira} tamanho="grande" />
            {percentualDoBenchmark != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                {formatPercent(percentualDoBenchmark)} do {LABEL_INDICADOR[indicador]}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SeletorPill
          value={periodo}
          onChange={(v) => {
            setPeriodo(v);
            setPontoClicadoIdx(null);
          }}
          options={OPCOES_PERIODO.map((o) => ({ valor: o.valor, label: o.label }))}
        />
        {!eIntraday && (
          <SeletorPill
            value={indicador}
            onChange={(v) => {
              setIndicador(v);
              setPontoClicadoIdx(null);
            }}
            options={INDICADORES_VALIDOS.map((ind) => ({ valor: ind, label: LABEL_INDICADOR[ind] }))}
          />
        )}
      </div>

      {semHistorico ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
          Histórico insuficiente para exibir a evolução.
        </div>
      ) : dadosInsuficientes ? (
        <div className="flex h-56 items-center justify-center px-4 text-center text-sm text-slate-400 dark:text-slate-500">
          {eIntraday
            ? "Ainda não há pontos suficientes hoje — abra a carteira de novo mais tarde pra acumular mais um ponto."
            : "Sem pontos suficientes nesse período."}
        </div>
      ) : (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {modo === "rentabilidade" ? (
                <ComposedChart
                  data={formatadoPercentual}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  onClick={aoClicarNoGrafico}
                  style={{ cursor: "pointer" }}
                >
                  <defs>
                    <linearGradient id="gradienteRentabilidade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-navy-950)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--color-navy-950)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
                    axisLine={{ stroke: "var(--color-chart-grid)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatPercent(Number(value ?? 0)),
                      name === "valor_total_pct" ? "Carteira" : LABEL_INDICADOR[indicador],
                    ]}
                    labelFormatter={(label) => label}
                    contentStyle={{
                      background: "var(--color-tooltip-bg)",
                      border: "1px solid var(--color-tooltip-border)",
                      borderRadius: 12,
                      color: "var(--color-chart-label)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--color-chart-label)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor_total_pct"
                    stroke="#1c3f6e"
                    strokeWidth={2.5}
                    fill="url(#gradienteRentabilidade)"
                    dot={false}
                    activeDot={{ r: 5, stroke: "#1c3f6e", strokeWidth: 2, fill: "#fff" }}
                  />
                  {formatadoPercentual.some((d) => d.valor_benchmark_pct != null) && (
                    <Line
                      type="monotone"
                      dataKey="valor_benchmark_pct"
                      stroke="#94a3b8"
                      strokeWidth={1.75}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  )}
                </ComposedChart>
              ) : (
                <LineChart data={formatadoReais} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
                    axisLine={{ stroke: "var(--color-chart-grid)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatBRLCompact}
                    width={56}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatBRLCompact(Number(value ?? 0)),
                      name === "valor_total" ? "Carteira" : LABEL_INDICADOR[indicador],
                    ]}
                    labelFormatter={(label) => label}
                    contentStyle={{
                      background: "var(--color-tooltip-bg)",
                      border: "1px solid var(--color-tooltip-border)",
                      borderRadius: 12,
                      color: "var(--color-chart-label)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--color-chart-label)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor_total"
                    stroke="#1c3f6e"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  {formatadoReais.some((d) => d.valor_benchmark != null) && (
                    <Line
                      type="monotone"
                      dataKey="valor_benchmark"
                      stroke="#94a3b8"
                      strokeWidth={1.75}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {modo === "rentabilidade" && !eIntraday && retornoBenchmark != null && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                {LABEL_INDICADOR[indicador]}
              </span>
              <VariacaoBadge valor={retornoBenchmark} />
            </div>
          )}

          {modo === "rentabilidade" && pontoClicado ? (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-100 dark:bg-white/10 px-3 py-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">{pontoClicado.label}</span>
              <VariacaoBadge valor={pontoClicado.valor_total_pct} />
            </div>
          ) : (
            modo === "rentabilidade" && (
              <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                Toque num ponto da linha pra ver a rentabilidade naquela data.
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}
