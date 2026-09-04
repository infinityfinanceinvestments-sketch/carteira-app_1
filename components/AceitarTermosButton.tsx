"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AceitarTermosButton({ destino }: { destino: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aceitar() {
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/termos/aceitar", { method: "POST" });
      if (!res.ok) {
        setErro("Não foi possível registrar o aceite. Tente novamente.");
        return;
      }
      router.push(destino);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      {erro && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>
      )}
      <button
        type="button"
        onClick={aceitar}
        disabled={carregando}
        className="w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[var(--color-navy-950)] transition hover:bg-white/90 disabled:opacity-60"
      >
        {carregando ? "..." : "Li e concordo com os termos"}
      </button>
    </div>
  );
}
