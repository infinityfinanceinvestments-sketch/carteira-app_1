"use client";

import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

export default function ModeloSelector({
  clienteId,
  carteiraModeloId,
  opcoes,
}: {
  clienteId: number;
  carteiraModeloId: number | null;
  opcoes: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();

  return (
    <select
      defaultValue={carteiraModeloId ?? ""}
      onChange={async (e) => {
        const valor = e.target.value ? Number(e.target.value) : null;
        const res = await fetch(`/api/clientes/${clienteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carteira_modelo_id: valor }),
        });
        if (!res.ok) {
          mostrarToast("Não foi possível trocar a carteira-modelo.", "erro");
          return;
        }
        mostrarToast("Carteira-modelo atualizada.");
        router.refresh();
      }}
      className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1 text-xs"
    >
      <option value="">Sem carteira-modelo</option>
      {opcoes.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nome}
        </option>
      ))}
    </select>
  );
}
