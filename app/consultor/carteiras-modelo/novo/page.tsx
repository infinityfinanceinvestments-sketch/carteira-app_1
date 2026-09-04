import AlocacoesForm from "@/components/AlocacoesForm";

export default function NovaCarteiraModeloPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-black dark:text-white">Nova carteira-modelo</h1>
      <AlocacoesForm modoCriacao alocacoesIniciais={[]} />
    </div>
  );
}
