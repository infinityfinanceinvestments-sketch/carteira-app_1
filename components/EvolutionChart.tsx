"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatHoraBr } from "@/lib/formatacao";

export interface PontoEvolucao {
  data: string;
  valor_total: number;
  valor_benchmark: number | null;
}

// Ponto intraday (ver lib/intraday.ts) — só existe pro filtro "1D": um
// ponto por abertura de carteira ao longo do dia, sem resolução de
// benchmark (os índices de mercado só têm fechamento diário, não intraday).
export interface PontoIntraday {
  momento: string;
  valor_total: number;
}

const formatBRLCompact = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  });

function formatMesAno(iso: string) {
  const [ano, mes] = iso.split("-");
  const nomes = [
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
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
}

function formatDiaMes(iso: string) {
  const [, mes, dia] = iso.split("-");
  const nomes = [
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
  return `${Number(dia)} ${nomes[Number(mes) - 1]}`;
}

type Periodo = "1d" | "7d" | "30d" | "90d" | "6m" | "1a" | "tudo";

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

export default function EvolutionChart({
  dados,
  intraday,
  benchmarkLabel,
}: {
  dados: PontoEvolucao[];
  /** Pontos de hoje pro filtro "1D" (ver lib/intraday.ts). Opcional — sem
   *  isso, "1D" só mostra a mensagem de "sem pontos suficientes". */
  intraday?: PontoIntraday[];
  benchmarkLabel?: string;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const eIntraday = periodo === "1d";

  const dadosFiltrados = useMemo(() => {
    if (eIntraday) return [];
    const opcao = OPCOES_PERIODO.find((o) => o.valor === periodo);
    return filtrarPorPeriodo(dados, opcao?.dias ?? null);
  }, [dados, periodo, eIntraday]);

  const usarDiaMes = periodo === "7d" || periodo === "30d";
  const formatado = eIntraday
    ? (intraday ?? []).map((p) => ({
        data: p.momento,
        valor_total: p.valor_total,
        valor_benchmark: null as number | null,
        label: formatHoraBr(p.momento),
      }))
    : dadosFiltrados.map((d) => ({
        ...d,
        label: usarDiaMes ? formatDiaMes(d.data) : formatMesAno(d.data),
      }));

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap gap-1">
        {OPCOES_PERIODO.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => setPeriodo(o.valor)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              periodo === o.valor
                ? "bg-[var(--color-navy-950)] text-white"
                : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {!eIntraday && dados.length < 2 ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
          Histórico insuficiente para exibir a evolução.
        </div>
      ) : formatado.length < 2 ? (
        <div className="flex h-56 items-center justify-center px-4 text-center text-sm text-slate-400 dark:text-slate-500">
          {eIntraday
            ? "Ainda não há pontos suficientes hoje — abra a carteira de novo mais tarde pra acumular mais um ponto."
            : "Sem pontos suficientes nesse período."}
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatado} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  name === "valor_total" ? "Carteira" : benchmarkLabel ?? "Benchmark",
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
              {formatado.some((d) => d.valor_benchmark != null) && (
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
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
