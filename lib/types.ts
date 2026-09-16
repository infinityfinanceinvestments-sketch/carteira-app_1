export type Papel = "consultor" | "cliente";
export type PerfilRisco = "conservador" | "moderado" | "arrojado";
export type TipoOperacao = "compra" | "venda" | "manutencao" | "rebalanceamento";
export type StatusRecomendacao =
  | "pendente"
  | "enviada"
  | "aceita"
  | "recusada"
  | "executada"
  | "expirada";

export const CLASSES_ATIVO = [
  "Renda Fixa",
  "Ações",
  "Fundos",
  "FIIs",
  "ETFs",
  "Moeda Estrangeira",
  "Cripto",
] as const;
export type ClasseAtivo = (typeof CLASSES_ATIVO)[number];

export interface Usuario {
  id: number;
  email: string;
  senha_hash: string;
  papel: Papel;
  nome: string;
  criado_em: string;
}

export interface Cliente {
  id: number;
  usuario_id: number;
  consultor_id: number | null;
  nome: string;
  email: string;
  perfil_risco: PerfilRisco;
  objetivo: string | null;
  carteira_modelo_id: number | null;
  benchmark: string;
  criado_em: string;
}

export interface Conta {
  id: number;
  cliente_id: number;
  instituicao: string;
  origem: "manual" | "importacao" | "api";
  criado_em: string;
}

export interface Posicao {
  id: number;
  conta_id: number;
  ativo: string;
  classe: string;
  quantidade: number;
  preco_medio: number;
  valor_atual: number;
  atualizado_em: string;
  // Só relevante pra Renda Fixa — ver lib/rendaFixaIndexada.ts. `null`
  // quando a posição não tem atualização automática de valor (o padrão).
  indexador: string | null;
  indexador_percentual: number | null;
}

export interface FavoritoMercado {
  id: number;
  cliente_id: number;
  ticker: string;
  criado_em: string;
}

export interface CarteiraModelo {
  id: number;
  nome: string;
  descricao: string | null;
  criado_em: string;
}

export interface AlocacaoAlvo {
  id: number;
  carteira_modelo_id: number;
  classe: string;
  percentual_alvo: number;
}

export interface HistoricoPatrimonio {
  id: number;
  cliente_id: number;
  data: string;
  valor_total: number;
  valor_benchmark: number | null;
}

export interface TermoAceite {
  id: number;
  usuario_id: number;
  versao: string;
  aceito_em: string;
}

export interface TokenRedefinicaoSenha {
  id: number;
  usuario_id: number;
  token: string;
  expira_em: string;
  usado: number;
  criado_em: string;
}

export interface LogAuditoria {
  id: number;
  cliente_id: number;
  usuario_id: number | null;
  acao: string;
  detalhes: string;
  criado_em: string;
}

export type TipoProvento = "dividendo" | "jcp" | "rendimento";
export interface Provento {
  id: number;
  cliente_id: number;
  ativo: string;
  tipo: TipoProvento;
  valor: number;
  data_pagamento: string;
  criado_em: string;
}

export type TipoNotificacao =
  | "recomendacao"
  | "variacao_preco"
  | "desvio_modelo"
  | "objetivo_concluido";
export interface Notificacao {
  id: number;
  cliente_id: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  referencia_id: number | null;
  lida: number;
  criado_em: string;
}

export interface Recomendacao {
  id: number;
  cliente_id: number;
  ativo: string;
  classe: string;
  tipo_operacao: TipoOperacao;
  justificativa: string;
  status: StatusRecomendacao;
  historico_status: string;
  arquivada_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type StatusSolicitacaoRecomendacao = "pendente" | "atendida";
export interface SolicitacaoRecomendacao {
  id: number;
  cliente_id: number;
  mensagem: string | null;
  status: StatusSolicitacaoRecomendacao;
  criado_em: string;
  atendida_em: string | null;
}

// Meta gameficada (aba "Objetivos") — não confundir com `Cliente.objetivo`,
// que é o texto livre do questionário de suitability. `tipo` decide qual
// dupla de campos é usada: 'quantidade_ativo' usa `ativo`/`meta_quantidade`
// (progresso calculado a partir das posições do cliente); 'valor_livre' usa
// `meta_valor`/`progresso_manual` (progresso atualizado manualmente pelo
// consultor). Ver lib/repo/objetivos.ts pro cálculo de progresso.
export type TipoObjetivo = "quantidade_ativo" | "valor_livre";
export interface Objetivo {
  id: number;
  cliente_id: number;
  titulo: string;
  descricao: string | null;
  tipo: TipoObjetivo;
  ativo: string | null;
  meta_quantidade: number | null;
  meta_valor: number | null;
  progresso_manual: number;
  concluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

// Objetivo com o progresso já calculado, pronto pra exibir barra de
// progressão — devolvido pelas rotas de API em vez do registro cru.
export interface ObjetivoComProgresso extends Objetivo {
  valorAtual: number;
  meta: number;
  progressoPercentual: number;
  concluido: boolean;
}
