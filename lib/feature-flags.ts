// Flags simples pra ligar/desligar pedaços do app sem apagar o código —
// muda o valor aqui, manda pro GitHub (commit + push) e o Railway atualiza
// sozinho. Diferente de lib/rate-limit.ts (que usa variável de ambiente),
// aqui é só uma constante porque isso é uma decisão de produto, não algo
// que precisa mudar em produção sem redeploy.

/** Tela/seção de Proventos (dividendos, JCP, rendimentos). Desligada por
 * enquanto, a pedido — o componente real (components/ProventosSection.tsx)
 * continua todo aqui, só não é mostrado pro usuário até virar `true`. Com
 * isso desligado, as páginas mostram um aviso de "em breve" no lugar. */
export const PROVENTOS_HABILITADO = false;
