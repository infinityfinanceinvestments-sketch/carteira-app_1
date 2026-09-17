CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('consultor','cliente')),
  nome TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS carteiras_modelo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alocacoes_alvo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  carteira_modelo_id INTEGER NOT NULL REFERENCES carteiras_modelo(id) ON DELETE CASCADE,
  classe TEXT NOT NULL,
  percentual_alvo REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  consultor_id INTEGER REFERENCES usuarios(id),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Livre (sem validação de formato — DDD/9º dígito variam), opcional.
  telefone TEXT,
  perfil_risco TEXT NOT NULL DEFAULT 'moderado' CHECK (perfil_risco IN ('conservador','moderado','arrojado')),
  objetivo TEXT,
  carteira_modelo_id INTEGER REFERENCES carteiras_modelo(id),
  benchmark TEXT NOT NULL DEFAULT 'CDI',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  instituicao TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','importacao','api')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posicoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  ativo TEXT NOT NULL,
  classe TEXT NOT NULL,
  quantidade REAL NOT NULL,
  preco_medio REAL NOT NULL,
  valor_atual REAL NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  -- Só usado em posições de Renda Fixa marcadas pelo consultor como
  -- indexadas (ex: "100% do CDI") — ver lib/rendaFixaIndexada.ts. NULL
  -- (o padrão) significa "sem atualização automática", igual sempre foi.
  indexador TEXT,
  indexador_percentual REAL
);

CREATE TABLE IF NOT EXISTS historico_patrimonio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  valor_total REAL NOT NULL,
  valor_benchmark REAL
);

-- Pontos intraday do patrimônio — diferente de historico_patrimonio (que
-- guarda só 1 ponto por DIA, sobrescrito a cada abertura), essa tabela
-- ACUMULA um ponto a cada abertura de carteira (com throttle, ver
-- lib/intraday.ts) — é o que alimenta o filtro "1D" do gráfico de evolução
-- com uma visão dentro do próprio dia. Só guarda pontos recentes: linhas de
-- dias anteriores são limpas automaticamente (ver limparIntradayAntigo).
CREATE TABLE IF NOT EXISTS historico_intraday (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  momento TEXT NOT NULL DEFAULT (datetime('now')),
  valor_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS favoritos_mercado (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cliente_id, ticker)
);

CREATE TABLE IF NOT EXISTS termos_aceites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  versao TEXT NOT NULL,
  aceito_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (usuario_id, versao)
);

CREATE TABLE IF NOT EXISTS tokens_redefinicao_senha (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expira_em TEXT NOT NULL,
  usado INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS log_auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  detalhes TEXT NOT NULL DEFAULT '{}',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ativo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('dividendo','jcp','rendimento')),
  valor REAL NOT NULL,
  data_pagamento TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('recomendacao','variacao_preco','desvio_modelo','objetivo_concluido','movimentacao','objetivo_criado')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  referencia_id INTEGER,
  lida INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recomendacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ativo TEXT NOT NULL,
  classe TEXT NOT NULL,
  tipo_operacao TEXT NOT NULL CHECK (tipo_operacao IN ('compra','venda','manutencao','rebalanceamento')),
  justificativa TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enviada' CHECK (status IN ('pendente','enviada','aceita','recusada','executada','expirada')),
  historico_status TEXT NOT NULL DEFAULT '[]',
  arquivada_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pedido do cliente pro consultor mandar uma recomendação nova (botão
-- "Pedir recomendação" na aba de Recomendações). `status` fica 'pendente'
-- até o consultor criar uma recomendação nova pro cliente (o que já marca
-- automaticamente como 'atendida' — ver POST /api/clientes/[id]/recomendacoes).
CREATE TABLE IF NOT EXISTS solicitacoes_recomendacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','atendida')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atendida_em TEXT
);

-- Pedido do cliente de lançar um aporte ou retirada na própria carteira —
-- como ainda não há integração automática com corretoras, é assim que o
-- cliente informa uma movimentação real que fez. Fica 'pendente' até o
-- consultor validar (ver POST/PATCH em
-- app/api/clientes/[id]/movimentacoes) — só quando aprovada é que
-- `posicoes` é de fato alterada (ver aplicarAporteEmPosicao/
-- aplicarRetiradaEmPosicao em lib/repo/posicoes.ts).
-- `posicao_id`: preenchido quando o cliente escolhe "ativo que já tenho" —
--   NULL só é permitido em aportes de ativo novo (retirada sempre precisa
--   de uma posição existente pra sacar). Guardamos `ativo`/`classe` em
--   colunas próprias (em vez de só o FK) pra manter o registro legível
--   mesmo se a posição for consolidada/renomeada/removida depois.
-- `quantidade`: opcional — obrigatória só faz sentido informar pra ativos
--   com unidade clara (ações, FIIs, ETFs); pra Renda Fixa o cliente
--   normalmente só sabe o valor em R$, então fica NULL e o valor é tratado
--   como um ajuste direto no custo/valor da posição.
CREATE TABLE IF NOT EXISTS movimentacoes_pendentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('aporte','retirada')),
  posicao_id INTEGER REFERENCES posicoes(id) ON DELETE SET NULL,
  ativo TEXT NOT NULL,
  classe TEXT NOT NULL,
  quantidade REAL,
  valor REAL NOT NULL,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada')),
  nota_consultor TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  respondida_em TEXT
);

-- Metas gameficadas que o consultor traça junto com o cliente (ex: "acumular
-- 400 ações de BBAS3"). Não confundir com `clientes.objetivo`, que é um
-- campo de texto livre preenchido no questionário de suitability — essa
-- tabela é a aba "Objetivos" nova, com progresso e barra de progressão.
-- tipo = 'quantidade_ativo': progresso calculado automaticamente somando a
--   quantidade em posição do `ativo` informado (ver lib/repo/objetivos.ts) —
--   pensado pra ações/FIIs/ETFs/cripto, onde "quantidade de unidades" faz
--   sentido como meta.
-- tipo = 'valor_ativo': mesma ideia, mas somando o VALOR (R$) em posição do
--   `ativo` em vez da quantidade — pensado pra Renda Fixa, onde a posição
--   normalmente tem quantidade=1 (ver comentário em lib/movimentacoes.ts) e
--   quem importa é o valor investido, não "unidades".
-- tipo = 'valor_livre': meta manual — o consultor vai atualizando
--   `progresso_manual` conforme o combinado com o cliente.
CREATE TABLE IF NOT EXISTS objetivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('quantidade_ativo','valor_ativo','valor_livre')),
  ativo TEXT,
  meta_quantidade REAL,
  meta_valor REAL,
  progresso_manual REAL NOT NULL DEFAULT 0,
  concluido_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Valores brutos (não acumulados) de indicadores de mercado (CDI diário,
-- IPCA mensal, fechamento de IBOV/S&P 500), buscados de fontes externas
-- (Banco Central, Yahoo Finance) e guardados aqui pra nunca precisar
-- rebuscar um dia que já foi publicado — esses valores não mudam depois de
-- publicados. Guarda o valor "cru" (não o índice acumulado base-100, que
-- depende da data inicial escolhida em cada consulta) pra servir qualquer
-- intervalo de datas a partir do mesmo dado.
CREATE TABLE IF NOT EXISTS indices_valores_brutos (
  indicador TEXT NOT NULL,
  data TEXT NOT NULL,
  valor_bruto REAL NOT NULL,
  PRIMARY KEY (indicador, data)
);

-- Verificação em duas etapas (2FA) por e-mail, exigida só no primeiro acesso
-- de um dispositivo/navegador novo (ver lib/dois-fatores.ts). O código em si
-- nunca é guardado em texto puro, só o hash — igual senha.
CREATE TABLE IF NOT EXISTS codigos_verificacao_login (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_hash TEXT NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  usado INTEGER NOT NULL DEFAULT 0,
  expira_em TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dispositivos que já passaram pela verificação de código uma vez — o
-- navegador guarda um cookie de longa duração (180 dias) cujo hash bate com
-- uma linha aqui, então os próximos logins nesse mesmo navegador pulam o
-- e-mail de verificação.
CREATE TABLE IF NOT EXISTS dispositivos_confiaveis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  ultimo_uso_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices nas colunas de chave estrangeira mais consultadas — as tabelas já
-- nasceram com PRIMARY KEY (indexado automaticamente) e a UNIQUE de
-- favoritos_mercado (que o SQLite também indexa sozinho), mas nenhuma FK
-- tinha índice próprio. Com poucos clientes isso não fazia diferença
-- perceptível, mas evita variar performance conforme a base cresce.
CREATE INDEX IF NOT EXISTS idx_alocacoes_alvo_carteira_modelo_id ON alocacoes_alvo(carteira_modelo_id);
CREATE INDEX IF NOT EXISTS idx_clientes_usuario_id ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_consultor_id ON clientes(consultor_id);
CREATE INDEX IF NOT EXISTS idx_contas_cliente_id ON contas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_posicoes_conta_id ON posicoes(conta_id);
CREATE INDEX IF NOT EXISTS idx_historico_patrimonio_cliente_id ON historico_patrimonio(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historico_intraday_cliente_momento ON historico_intraday(cliente_id, momento);
CREATE INDEX IF NOT EXISTS idx_termos_aceites_usuario_id ON termos_aceites(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tokens_redefinicao_senha_usuario_id ON tokens_redefinicao_senha(usuario_id);
-- token já é UNIQUE (SQLite indexa automaticamente), não precisa de índice à parte.
CREATE INDEX IF NOT EXISTS idx_log_auditoria_cliente_id ON log_auditoria(cliente_id);
CREATE INDEX IF NOT EXISTS idx_proventos_cliente_id ON proventos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_cliente_id ON notificacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recomendacoes_cliente_id ON recomendacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_recomendacao_cliente_id ON solicitacoes_recomendacao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_pendentes_cliente_id ON movimentacoes_pendentes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_pendentes_status ON movimentacoes_pendentes(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_pendentes_posicao_id ON movimentacoes_pendentes(posicao_id);
CREATE INDEX IF NOT EXISTS idx_objetivos_cliente_id ON objetivos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_codigos_verificacao_login_usuario_id ON codigos_verificacao_login(usuario_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_confiaveis_usuario_id ON dispositivos_confiaveis(usuario_id);
-- token_hash já é UNIQUE (SQLite indexa automaticamente), não precisa de índice à parte.
