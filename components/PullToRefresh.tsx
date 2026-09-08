"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const LIMIAR_PX = 64;
const MAX_INDICADOR_PX = 90;
const RESISTENCIA = 0.5; // puxar 2px de dedo move o indicador só 1px — sensação de "elástico"

/** Puxar pra baixo no topo da tela recarrega os dados da página (mesmo
 *  mecanismo do botão/ação normal — router.refresh(), sem reload cheio).
 *  Só ativa quando a página já está no topo, pra não atrapalhar rolagem
 *  normal. Não faz preventDefault no touch (deixa o bounce nativo do
 *  celular acontecer em paralelo) — mantém simples e não quebra o scroll. */
export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [puxando, setPuxando] = useState(0);
  const [prontoPraSoltar, setProntoPraSoltar] = useState(false);
  const inicioY = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (isPending || window.scrollY > 0) {
      inicioY.current = null;
      return;
    }
    inicioY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (inicioY.current === null) return;
    const dy = e.touches[0].clientY - inicioY.current;
    if (dy <= 0 || window.scrollY > 0) {
      setPuxando(0);
      setProntoPraSoltar(false);
      return;
    }
    const distancia = Math.min(MAX_INDICADOR_PX, dy * RESISTENCIA);
    setPuxando(distancia);
    setProntoPraSoltar(distancia >= LIMIAR_PX);
  }

  function onTouchEnd() {
    if (inicioY.current === null) return;
    inicioY.current = null;
    if (prontoPraSoltar) {
      startTransition(() => router.refresh());
    }
    setPuxando(0);
    setProntoPraSoltar(false);
  }

  const mostrarIndicador = puxando > 4 || isPending;
  const alturaIndicador = isPending ? 44 : puxando;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        aria-hidden={!mostrarIndicador}
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
        style={{ height: mostrarIndicador ? alturaIndicador : 0 }}
      >
        <div
          className={`h-6 w-6 rounded-full border-2 border-[var(--color-accent)] border-t-transparent ${
            isPending ? "animate-spin" : ""
          }`}
          style={
            isPending
              ? undefined
              : { transform: `rotate(${(puxando / LIMIAR_PX) * 360}deg)`, opacity: Math.min(1, puxando / LIMIAR_PX) }
          }
        />
      </div>
      {children}
    </div>
  );
}
