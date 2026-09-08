// IMPORTANTE: mesma observação de lib/termos.ts — este texto cobre os
// pontos básicos esperados de um aviso de recomendação de investimento,
// mas não substitui revisão por advogado/compliance antes de uso real,
// já que consultoria de investimentos é atividade regulada pela CVM.
export default function Disclaimer() {
  return (
    <p className="rounded-xl bg-slate-100 dark:bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
      Esta recomendação reflete a análise do consultor no momento do registro,
      com base no perfil de risco e nos objetivos informados pelo cliente, e
      não constitui garantia de resultado nem oferta de produto financeiro. A
      decisão final de investir é sempre do cliente, que deve avaliar se a
      recomendação permanece adequada à sua situação antes de executá-la.
      Investimentos envolvem riscos, inclusive de perda do capital investido,
      e rentabilidade passada não representa garantia de rentabilidade futura.
    </p>
  );
}
