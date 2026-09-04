"use client";

import { useRouter } from "next/navigation";

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

  return (
    <select
      defaultValue={carteiraModeloId ?? ""}
      onChange={async (e) => {
        const valor = e.target.value ? Number(e.target.value) : null;
        await fetch(`/api/clientes/${clienteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carteira_modelo_id: valor }),
        });
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
