"use client";

import { useMemo, useState } from "react";
import { agruparPosicoesComRentabilidade } from "@/lib/gruposAtivo";
import { corDaClasse } from "@/lib/colors";
import VariacaoBadge from "@/components/VariacaoBadge";

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

/** Seção "Posições" da carteira do cliente: em vez da tabela plana com uma
 *  linha por ativo (difícil de ler numa tela de celular quando o cliente
 *  tem muitos papéis), agrupa por classe num menu suspenso — cada classe
 *  abre mostrando só o nome, o valor total e a rentabilidade parcial do
 *  grupo (mesmo cálculo de custo x valor atual da seção "Alocação", ver
 *  lib/gruposAtivo.ts); clicar expande a lista de ativos daquele grupo. */
export default function PosicoesAgrupadas({ posicoes }: { posicoes: PosicaoResumo[] }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => agruparPosicoesComRentabilidade(posicoes), [posicoes]);

  function alternar(grupo: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(grupo)) {
        novo.delete(grupo);
      } else {
        novo.add(grupo);
      }
      return novo;
    });
  }

  if (grupos.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Seu consultor ainda não carregou posições na sua carteira.
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-white/10">
      {grupos.map(({ grupo, valor, rentabilidadePercentual, itens }) => {
        const aberto = abertos.has(grupo);
        return (
          <div key={grupo}>
            <button
              type="button"
              onClick={() => alternar(grupo)}
              aria-expanded={aberto}
              className="flex w-full items-center justify-between gap-2 py-2.5 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: corDaClasse(grupo) }}
                />
                <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {grupo}
                </span>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  ({itens.length})
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-right">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatBRL(valor)}
                  </span>
                  <span className="block">
                    <VariacaoBadge valor={rentabilidadePercentual} />
                  </span>
                </span>
                <span
                  className={`text-base text-slate-300 dark:text-slate-600 transition-transform ${
                    aberto ? "rotate-90" : ""
                  }`}
                >
                  ›
                </span>
              </span>
            </button>
            {aberto && (
              <ul className="space-y-1 pb-3 pl-[18px]">
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
            )}
          </div>
        );
      })}
    </div>
  );
}
