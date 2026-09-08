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

## Colocando em produção (pra usar com clientes reais)

Hoje o app roda localmente (`npm run dev` / `npm run start`). Pra os
clientes acessarem de qualquer lugar, ele precisa estar hospedado num
serviço acessível pela internet, com HTTPS e um domínio. Duas opções que
funcionam bem com Next.js, sem precisar mexer no código:

1. **[Vercel](https://vercel.com)** — feito pelos criadores do Next.js,
   é o caminho com menos configuração manual. Plano Pro (~US$20/mês) é o
   recomendado pra uso comercial (o plano Hobby gratuito é só pra projetos
   pessoais/não comerciais, pelos termos da própria Vercel).
2. **[Railway](https://railway.com)** — mais barato pra começar
   (a partir de ~US$5/mês de uso), também suporta Next.js e Postgres
   gerenciado no mesmo lugar.

Em qualquer um dos dois, os passos são: conectar o repositório Git,
configurar as variáveis de ambiente (pelo menos `AUTH_SECRET`) no painel do
serviço, e apontar um domínio próprio (ex: `infinitytrading.com.br`,
registrável em [registro.br](https://registro.br), ~R$40/ano).

Enquanto o banco continuar sendo o arquivo `data.db` (SQLite), a hospedagem
escolhida precisa ter um disco persistente (nem toda hospedagem "serverless"
tem isso, pois cada execução costuma rodar num ambiente novo/efêmero) — é
por isso que o passo de migrar pra Postgres abaixo é importante antes de ir
ao ar de verdade com múltiplos clientes acessando ao mesmo tempo.

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
