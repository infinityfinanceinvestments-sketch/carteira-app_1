import { listarPosicoesDoCliente } from "./posicoes";
import { getClientePorId } from "./clientes";
import { listarAlocacoesAlvo } from "./carteiras-modelo";

export function valorTotalCarteira(clienteId: number): number {
  const posicoes = listarPosicoesDoCliente(clienteId);
  return posicoes.reduce((acc, p) => acc + p.valor_atual, 0);
}

export function alocacaoPorClasse(
  clienteId: number
): { classe: string; valor: number; percentual: number }[] {
  const posicoes = listarPosicoesDoCliente(clienteId);
  const total = posicoes.reduce((acc, p) => acc + p.valor_atual, 0);
  const porClasse = new Map<string, number>();
  for (const p of posicoes) {
    porClasse.set(p.classe, (porClasse.get(p.classe) ?? 0) + p.valor_atual);
  }
  return Array.from(porClasse.entries()).map(([classe, valor]) => ({
    classe,
    valor,
    percentual: total > 0 ? (valor / total) * 100 : 0,
  }));
}

export function desvioVsCarteiraModelo(
  clienteId: number
): { classe: string; atual: number; alvo: number; desvio: number }[] {
  const cliente = getClientePorId(clienteId);
  const atual = alocacaoPorClasse(clienteId);
  if (!cliente?.carteira_modelo_id) {
    return atual.map((a) => ({
      classe: a.classe,
      atual: a.percentual,
      alvo: 0,
      desvio: a.percentual,
    }));
  }
  const alvos = listarAlocacoesAlvo(cliente.carteira_modelo_id);
  const classes = new Set<string>([
    ...atual.map((a) => a.classe),
    ...alvos.map((a) => a.classe),
  ]);
  return Array.from(classes).map((classe) => {
    const a = atual.find((x) => x.classe === classe)?.percentual ?? 0;
    const alvo = alvos.find((x) => x.classe === classe)?.percentual_alvo ?? 0;
    return { classe, atual: a, alvo, desvio: a - alvo };
  });
}
