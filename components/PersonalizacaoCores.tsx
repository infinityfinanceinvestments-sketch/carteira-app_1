"use client";

import { useEffect, useState } from "react";
import {
  ESQUEMAS_PADRAO,
  CHAVE_COR_TEMA,
  derivarEsquemaPersonalizado,
  aplicarEsquemaCor,
  limparEsquemaCor,
  type EsquemaCor,
} from "@/lib/temaCores";

/** Seletor de cor do app na tela "Meu perfil" — 3 esquemas prontos +
 *  personalizada (o cliente escolhe qualquer cor, o resto é derivado). A
 *  aplicação inicial (antes do React montar, pra não piscar a cor padrão)
 *  fica no script em app/layout.tsx; aqui só troca ao vivo e persiste. */
export default function PersonalizacaoCores() {
  const [selecionado, setSelecionado] = useState<string>("azul");
  const [corPersonalizada, setCorPersonalizada] = useState("#2f7dfb");

  useEffect(() => {
    // Lê a preferência salva só depois de montar (localStorage não existe
    // no servidor) — a cor "de verdade" já foi aplicada antes disso pelo
    // script bloqueante em app/layout.tsx (evita o clarão); isso aqui só
    // atualiza qual botão aparece com o anel de "selecionado".
    try {
      const salvo = localStorage.getItem(CHAVE_COR_TEMA);
      if (!salvo) return;
      const tema = JSON.parse(salvo) as { id: string; corBase?: string };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência só existe no client (localStorage), não dá pra saber no primeiro render do servidor
      setSelecionado(tema.id);
      if (tema.id === "personalizado" && tema.corBase) setCorPersonalizada(tema.corBase);
    } catch {
      // localStorage indisponível — fica no padrão azul, sem travar a tela.
    }
  }, []);

  function escolherPreset(esquema: EsquemaCor) {
    setSelecionado(esquema.id);
    aplicarEsquemaCor(esquema);
    try {
      if (esquema.id === "azul") {
        // Azul é o visual original — remove o override em vez de gravar
        // um esquema igual ao que já vem do CSS.
        localStorage.removeItem(CHAVE_COR_TEMA);
        limparEsquemaCor();
        return;
      }
      localStorage.setItem(CHAVE_COR_TEMA, JSON.stringify({ id: esquema.id }));
    } catch {
      // segue funcionando só nesta sessão, sem lembrar na próxima visita
    }
  }

  function escolherPersonalizada(cor: string) {
    setCorPersonalizada(cor);
    setSelecionado("personalizado");
    aplicarEsquemaCor(derivarEsquemaPersonalizado(cor));
    try {
      localStorage.setItem(
        CHAVE_COR_TEMA,
        JSON.stringify({ id: "personalizado", corBase: cor })
      );
    } catch {
      // idem — sem localStorage só perde a preferência ao recarregar
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ESQUEMAS_PADRAO.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => escolherPreset(e)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              selecionado === e.id
                ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent-soft)]"
                : "border-slate-200 dark:border-white/10"
            }`}
          >
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ background: `linear-gradient(135deg, ${e.sky}, ${e.accent})` }}
            />
            <span className="text-slate-700 dark:text-slate-200">{e.nome}</span>
          </button>
        ))}

        <label
          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
            selecionado === "personalizado"
              ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent-soft)]"
              : "border-slate-200 dark:border-white/10"
          }`}
        >
          <input
            type="color"
            value={corPersonalizada}
            onChange={(e) => escolherPersonalizada(e.target.value)}
            className="h-4 w-4 shrink-0 cursor-pointer rounded-full border-none p-0"
            aria-label="Escolher cor personalizada"
          />
          <span className="text-slate-700 dark:text-slate-200">Personalizada</span>
        </label>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        A cor escolhida fica salva só neste aparelho/navegador.
      </p>
    </div>
  );
}
