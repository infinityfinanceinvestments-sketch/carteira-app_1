"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { corDaClasse } from "@/lib/colors";

export interface AlocacaoItem {
  classe: string;
  valor: number;
  percentual: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AllocationDonut({ dados }: { dados: AlocacaoItem[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Nenhuma posição cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="h-48 w-full sm:w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="classe"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {dados.map((d) => (
                <Cell key={d.classe} fill={corDaClasse(d.classe)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [
                formatBRL(Number(value ?? 0)),
                item?.payload?.classe ?? "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1.5 text-sm">
        {dados
          .slice()
          .sort((a, b) => b.valor - a.valor)
          .map((d) => (
            <li key={d.classe} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: corDaClasse(d.classe) }}
                />
                {d.classe}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {d.percentual.toFixed(1)}%
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
