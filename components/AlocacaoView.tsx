"use client";

import { useMemo, useState } from "react";
import AllocationDonut, { type AlocacaoItem } from "./AllocationDonut";
import { agruparAlocacao, agruparPosicoesComRentabilidade } from "@/lib/gruposAtivo";
import { corDaClasse } from "@/lib/colors";
import VariacaoBadge, { formatPercent } from "@/components/VariacaoBadge";

interface PosicaoResumo {
  id: number;
  ativo: string;
  classe: string;
  valor_atual: number;
  quantidade: number;
  preco_medio: number;
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
  // Começa em "lista" porque é o modo que já mostra o que o cliente mais
  // pede: valor e rentabilidade por classe logo abaixo do gráfico de
  // evolução, sem precisar trocar de aba primeiro.
  const [modo, setModo] = useState<"pizza" | "lista">("lista");

  const alocacaoAgrupada = useMemo(() => agruparAlocacao(alocacao), [alocacao]);

  // Mesmo agrupamento (com rentabilidade) usado na seção "Posições" — ver
  // lib/gruposAtivo.ts. Só falta o percentual sobre o total, calculado
  // aqui em cima do valor total das posições.
  const grupos = useMemo(() => {
    const totalValor = posicoes.reduce((soma, p) => soma + p.valor_atual, 0);
    return agruparPosicoesComRentabilidade(posicoes).map((g) => ({
      ...g,
      percentualDoTotal: totalValor > 0 ? (g.valor / totalValor) * 100 : 0,
    }));
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
          {grupos.map(({ grupo, valor, itens, percentualDoTotal, rentabilidadePercentual }) => (
            <div key={grupo}>
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="flex items-start gap-2">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: corDaClasse(grupo) }}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                      {grupo}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500">
                      {formatPercent(percentualDoTotal)}
                    </span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatBRL(valor)}
                  </span>
                  <span className="block">
                    <VariacaoBadge valor={rentabilidadePercentual} />
                  </span>
                </span>
              </div>
              {/* já vem ordenado por valor decrescente (agruparPosicoesComRentabilidade) */}
              <ul className="space-y-1 pl-[18px]">
                {itens.map((p) => (
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
