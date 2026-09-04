"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export interface PontoProventoMensal {
  mes: string;
  total: number;
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

export default function ProventosMensalChart({ dados }: { dados: PontoProventoMensal[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Sem dados suficientes pra montar o gráfico ainda.
      </div>
    );
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatBRLCompact}
            tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => [formatBRL(Number(value ?? 0)), "Proventos"]}
            labelStyle={{ color: "var(--color-chart-label)" }}
            contentStyle={{
              background: "var(--color-tooltip-bg)",
              border: "1px solid var(--color-tooltip-border)",
              borderRadius: 12,
              color: "var(--color-chart-label)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#1c3f6e" barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
