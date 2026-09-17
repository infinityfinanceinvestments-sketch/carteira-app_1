"use client";

import { useMemo, useState } from "react";
import AllocationDonut, { type AlocacaoItem } from "./AllocationDonut";
import { agruparAlocacao, grupoDaClasse } from "@/lib/gruposAtivo";
import { corDaClasse } from "@/lib/colors";

interface PosicaoResumo {
  id: number;
  ativo: string;
  classe: string;
  valor_atual: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Seção "Alocação" da carteira do cliente: alterna entre o donut (pizza)
 *  já existente e uma lista com os investimentos agrupados por classe —
 *  os dois usam o mesmo agrupamento "enxuto" (ver lib/gruposAtivo.ts), só
 *  muda a forma de exibir. */
export default function AlocacaoView({
  alocacao,
  posicoes,
}: {
  alocacao: AlocacaoItem[];
  posicoes: PosicaoResumo[];
}) {
  const [modo, setModo] = useState<"pizza" | "lista">("pizza");

  const alocacaoAgrupada = useMemo(() => agruparAlocacao(alocacao), [alocacao]);

  const grupos = useMemo(() => {
    const porGrupo = new Map<string, { valor: number; itens: PosicaoResumo[] }>();
    for (const p of posicoes) {
      const grupo = grupoDaClasse(p.classe);
      if (!porGrupo.has(grupo)) porGrupo.set(grupo, { valor: 0, itens: [] });
      const entrada = porGrupo.get(grupo)!;
      entrada.valor += p.valor_atual;
      entrada.itens.push(p);
    }
    return [...porGrupo.entries()].sort((a, b) => b[1].valor - a[1].valor);
  }, [posicoes]);

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {(["pizza", "lista"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              modo === m
                ? "bg-[var(--color-navy-950)] text-white"
                : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
            }`}
          >
            {m === "pizza" ? "Pizza" : "Lista"}
          </button>
        ))}
      </div>

      {modo === "pizza" ? (
        <AllocationDonut dados={alocacaoAgrupada} />
      ) : grupos.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
          Nenhuma posição cadastrada ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(([grupo, dados]) => (
            <div key={grupo}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: corDaClasse(grupo) }}
                  />
                  {grupo}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {formatBRL(dados.valor)}
                </span>
              </div>
              <ul className="space-y-1 pl-[18px]">
                {dados.itens
                  .slice()
                  .sort((a, b) => b.valor_atual - a.valor_atual)
                  .map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
                    >
                      <span>{p.ativo}</span>
                      <span>{formatBRL(p.valor_atual)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
