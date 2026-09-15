# Carteira & Recomendações — MVP

App para consultoria de investimentos acompanhar a carteira dos clientes e
registrar/enviar recomendações. Construído a partir do escopo definido no
prompt "Prompt para o 10xapp" (consultor + cliente com login próprio,
importação de posições, carteiras-modelo, recomendações com histórico).

## Sobre esta versão (leia antes de tudo)

Este projeto foi construído diretamente aqui, como um **app web mobile-first**
(React/Next.js), e não como um app nativo publicável nas lojas (iOS/Android).
Isso foi uma escolha deliberada para entregar algo funcional agora — o
ambiente onde foi gerado não tem como compilar e publicar um binário nativo.
Na prática:

- A interface é otimizada para celular (navegação por abas, layout de
  coluna única) e pode ser "instalada" na tela inicial do celular
  (Adicionar à tela de início, no Safari/Chrome), o que já dá uma sensação de
  app nativo para uso diário.
- Para virar um app de verdade na App Store / Google Play, o caminho mais
  rápido a partir daqui é embrulhar esse mesmo front-end com **Capacitor**
  ou reescrever a camada de tela em **React Native/Expo** reaproveitando a
  API e o banco de dados como estão.
- A integração automática de posições via Open Finance/API de corretoras
  (mencionada no prompt original) **não está implementada** — ela depende de
  parcerias/homologação com um agregador (Belvo, Pluggy, Open Finance
  Brasil). O que existe é o fallback previsto no próprio prompt: importação
  manual via CSV.

## O que está pronto (escopo do MVP)

1. Login separado para consultor e cliente (sessão em cookie, com o papel de
   cada usuário controlando o que ele vê).
2. Cadastro de clientes pelo consultor, incluindo um questionário simples de
   perfil de investidor (suitability) que sugere o perfil de risco.
3. Importação de posições via CSV (upload de arquivo ou colar o conteúdo).
4. Carteira do cliente: posições, alocação por classe de ativo (gráfico) e
   evolução patrimonial.
5. Carteiras-modelo: o consultor define uma alocação-alvo por classe e o app
   mostra o desvio de cada cliente em relação ao modelo vinculado a ele.
6. Recomendações: o consultor registra (ativo, tipo de operação,
   justificativa), o cliente aceita/recusa/marca como já executada, e cada
   mudança de status fica no histórico da recomendação (rastreabilidade).
7. Disclaimer padrão nas recomendações (texto a ser revisado com
   jurídico/compliance antes de qualquer uso real).

Ficou para uma fase 2 (como já estava previsto no prompt original): chat
entre consultor e cliente, relatórios em PDF, múltiplos consultores/equipe,
integração automática com corretoras, e a compilação como app nativo.

## Stack técnica

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS 4** para estilo
- **SQLite via `node:sqlite`** (módulo nativo do Node, sem dependência
  externa) como banco de dados — arquivo único `data.db` na raiz do projeto
- **Recharts** para os gráficos (alocação, evolução, desvio vs. modelo)
- Autenticação própria e simples: senha com `bcryptjs`, sessão em JWT
  (`jose`) guardada em cookie `httpOnly`

Por que `node:sqlite` em vez de Prisma/Postgres? No ambiente onde este
projeto foi montado o download dos binários do Prisma estava bloqueado pela
rede, e um banco de arquivo único deixa o projeto rodando com `npm install`
sem precisar subir um banco separado. Para produção com múltiplos usuários
simultâneos reais, o caminho recomendado é migrar para Postgres (as funções
de acesso a dados estão todas isoladas em `lib/repo.ts`, então a troca é
localizada).

> **Requisito de versão**: Node.js 22.5 ou superior (o módulo `node:sqlite`
> é experimental nessa faixa de versões — um aviso `ExperimentalWarning` no
> terminal é esperado e inofensivo).

## Como rodar

```bash
npm install
npm run db:seed   # cria data.db e popula com dados de demonstração
npm run dev       # http://localhost:3000
```

Para rodar como em produção:

```bash
npm run build
npm run start
```

### Contas de demonstração

| Papel     | E-mail                  | Senha         |
| --------- | ------------------------ | ------------- |
| Consultor | consultor@carteira.app   | consultor123  |
| Cliente   | ana@carteira.app         | cliente123    |
| Cliente   | carlos@carteira.app      | cliente123    |
| Cliente   | fernanda@carteira.app    | cliente123    |

`npm run db:seed` pode ser rodado quantas vezes quiser — ele recria o banco
do zero com esses três clientes de exemplo (perfis conservador, moderado e
arrojado), carteiras-modelo, posições, histórico de evolução e recomendações
em status diferentes, para já dar para navegar pelo app sem cadastrar nada.

## Estrutura do projeto

```
app/
  login/                 tela de login
  consultor/              área do consultor (dashboard, clientes, carteiras-modelo, importar)
  cliente/                área do cliente (carteira, recomendações, perfil)
  api/                    rotas de API (auth, clientes, recomendações, carteiras-modelo, importação)
lib/
  db.ts                  conexão SQLite + migração do schema
  schema.sql             definição das tabelas
  repo.ts                todas as funções de acesso a dados (trocar de banco = mexer só aqui)
  auth.ts                sessão (JWT em cookie), hash de senha
  types.ts                tipos compartilhados
components/               componentes de UI (gráficos, formulários, navegação)
scripts/seed.mjs           script de dados de demonstração
proxy.ts                   controla acesso às áreas /consultor e /cliente por papel (Next.js 16 renomeou "middleware" para "proxy")
```

## Formato do CSV de importação

```
ativo,classe,quantidade,preco_medio,valor_atual
TESOURO SELIC 2029,Renda Fixa,10,1050.00,10800.00
PETR4,Ações,200,28.50,31.20
```

Classes aceitas: `Renda Fixa`, `Ações`, `Fundos`, `FIIs`, `ETFs`,
`Moeda Estrangeira`, `Cripto`.

## Variáveis de ambiente

Veja `.env.example` para a lista completa com comentários. Resumo:

- `AUTH_SECRET` — chave usada para assinar a sessão (JWT). **Obrigatória em
  produção** (`next start` / qualquer deploy) — o app se recusa a iniciar
  sem ela, de propósito, pra nunca ir ao ar com uma chave fraca/previsível.
  Em desenvolvimento local (`npm run dev`) não precisa configurar nada.
  Gere uma com:
  ```
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
- `RESEND_API_KEY` — opcional. Só necessária quando o envio automático de
  e-mail (redefinição de senha / verificação em dois fatores) estiver
  ativado. Sem ela, continua no modo atual (link manual).
- `DATABASE_URL` — opcional. Só necessária ao migrar de SQLite pra Postgres.
- `DB_PATH` — opcional. Caminho do arquivo do banco SQLite. Ver seção do
  Railway abaixo.
- `CONSULTOR_EMAIL` / `CONSULTOR_SENHA` / `CONSULTOR_NOME` — opcionais, só
  usadas em produção pra criar a primeira conta de consultor automaticamente.
  Ver seção do Railway abaixo.

## Colocando em produção (pra usar com clientes reais)

O app está pronto pra ir ao ar no **[Railway](https://railway.com)** — foi
a hospedagem escolhida porque, diferente de planos de hospedagem
"compartilhada"/serverless comuns (inclusive planos baratos como os da
Hostinger fora do VPS), ele mantém um servidor Node.js rodando de verdade
com disco persistente, que é exatamente o que o banco SQLite deste projeto
precisa — sem isso, o banco seria apagado a cada novo deploy. Já existe um
`railway.json` no projeto com a configuração de build/start.

Passo a passo:

1. **Criar o projeto no Railway**: conecte o repositório Git deste projeto
   pelo [railway.com](https://railway.com) ("New Project" → "Deploy from
   GitHub repo"). Ele detecta automaticamente que é um projeto Next.js.
2. **Criar um volume persistente**: no serviço, aba "Volumes" → criar um
   volume e montá-lo em `/data` (por exemplo). É nele que o arquivo do
   banco vai morar, sobrevivendo a cada novo deploy.
3. **Configurar as variáveis de ambiente** (aba "Variables" do serviço):
   - `AUTH_SECRET` — gere uma com o comando indicado acima e cole aqui.
     **Use uma chave diferente da que você usa em desenvolvimento local.**
   - `DB_PATH` = `/data/data.db` (ou o caminho que você escolheu no passo 2).
   - `CONSULTOR_EMAIL`, `CONSULTOR_SENHA`, `CONSULTOR_NOME` — os dados da
     sua conta real de consultor (não as credenciais de demonstração). O
     app cria essa conta sozinho na primeira vez que subir com o banco
     vazio — depois disso pode até apagar essas três variáveis, não fazem
     mais nada.
   - `RESEND_API_KEY` — opcional, se já tiver configurado o envio automático
     de e-mail.
4. **Deploy**: o Railway builda (`npm run build`) e sobe (`npm run start`)
   sozinho a cada push. Na primeira vez, acesse a URL que o Railway gera
   (algo como `infinity-trading.up.railway.app`) e faça login com o
   `CONSULTOR_EMAIL`/`CONSULTOR_SENHA` que você configurou.
5. **Domínio próprio** (opcional, mas recomendado pra passar credibilidade
   pros clientes): registre um domínio (ex: `infinitytrading.com.br`, em
   [registro.br](https://registro.br), ~R$40/ano) e aponte pra esse serviço
   na aba "Settings" → "Networking" → "Custom Domain" do Railway.

**Importante**: o `npm run db:seed` (que cria as contas de demonstração)
**nunca deve ser rodado em produção** — ele apaga o banco existente antes de
recriar do zero. Ele é só pra ambiente de desenvolvimento/teste.

## Próximos passos sugeridos

1. Revisar com jurídico/compliance o texto do disclaimer em
   `components/Disclaimer.tsx` e da página `/termos` antes de qualquer uso
   com clientes reais (consultoria de investimento é atividade regulada
   pela CVM).
2. Trocar SQLite por Postgres (ou outro banco gerenciado) antes de colocar
   em produção com mais de um usuário simultâneo — ver `DATABASE_URL` acima.
3. Configurar `RESEND_API_KEY` quando quiser ativar o envio automático de
   e-mail (redefinição de senha e verificação em dois fatores).
4. Contratar/negociar acesso a um agregador Open Finance (Belvo, Pluggy) ou
   parcerias diretas com corretoras para a importação automática de
   posições, substituindo o CSV manual.
