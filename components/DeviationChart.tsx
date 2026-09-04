"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";

export interface DesvioItem {
  classe: string;
  atual: number;
  alvo: number;
  desvio: number;
}

export default function DeviationChart({ dados }: { dados: DesvioItem[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Sem dados para comparar com a carteira-modelo.
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
        >
          <CartesianGrid stroke="var(--color-chart-grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="classe"
            width={110}
            tick={{ fontSize: 11, fill: "var(--color-chart-label)" }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="var(--color-chart-axis)" />
          <Tooltip
            formatter={(value, name, item) => {
              const v = Number(value ?? 0);
              if (name === "desvio") {
                const atual = Number(item?.payload?.atual ?? 0);
                const alvo = Number(item?.payload?.alvo ?? 0);
                return [
                  `${v > 0 ? "+" : ""}${v.toFixed(1)} p.p.`,
                  `Atual ${atual.toFixed(1)}% · Alvo ${alvo.toFixed(1)}%`,
                ];
              }
              return [String(v), String(name ?? "")];
            }}
            contentStyle={{
              background: "var(--color-tooltip-bg)",
              border: "1px solid var(--color-tooltip-border)",
              borderRadius: 12,
              color: "var(--color-chart-label)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-chart-label)" }}
          />
          <Bar dataKey="desvio" radius={4} barSize={16}>
            {dados.map((d) => (
              <Cell
                key={d.classe}
                fill={Math.abs(d.desvio) < 3 ? "#94a3b8" : d.desvio > 0 ? "#c8862b" : "#2b8fc0"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
        Desvio em pontos percentuais vs. a carteira-modelo (positivo = acima do
        alvo, negativo = abaixo).
      </p>
    </div>
  );
}
