import { notFound } from "next/navigation";
import Link from "next/link";
import { getCarteiraModeloPorId, listarAlocacoesAlvo } from "@/lib/repo";
import AlocacoesForm from "@/components/AlocacoesForm";

export default async function CarteiraModeloDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carteiraModelo = getCarteiraModeloPorId(Number(id));
  if (!carteiraModelo) notFound();
  const alocacoes = listarAlocacoesAlvo(carteiraModelo.id);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/consultor/carteiras-modelo" className="text-xs text-slate-400 dark:text-slate-500">
          ← Carteiras-modelo
        </Link>
        <h1 className="text-lg font-semibold text-black dark:text-white">{carteiraModelo.nome}</h1>
        {carteiraModelo.descricao && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{carteiraModelo.descricao}</p>
        )}
      </div>
      <AlocacoesForm
        carteiraModeloId={carteiraModelo.id}
        alocacoesIniciais={alocacoes.map((a) => ({
          classe: a.classe,
          percentual_alvo: a.percentual_alvo,
        }))}
      />
    </div>
  );
}
