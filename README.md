# Eco

MVP de controle de gastos pessoais: contas, cartões de crédito com faturas, compras parceladas, mensalidades/assinaturas recorrentes, lembretes de vencimento, resumo mensal por categoria e carteira de investimentos (ações, FIIs, cripto e dólar) com proventos.

```
backend/    API (Bun + Fastify 5 + Drizzle + Postgres + Zod 4 + Scalar) + crons
frontend/   SPA (Vite + React 19 + TanStack Router/Query + shadcn/ui + Tailwind v4 + Motion)
```

Os dois projetos são independentes (cada um com seu `package.json`, sem workspace compartilhado). Convenções de código em [`CLAUDE.md`](CLAUDE.md), [`backend/CLAUDE.md`](backend/CLAUDE.md) e [`frontend/CLAUDE.md`](frontend/CLAUDE.md).

## Início rápido

Pré-requisitos: [Bun](https://bun.sh) 1.3+, [pnpm](https://pnpm.io) e Docker (ou um PostgreSQL acessível).

```bash
# 0. Banco (Postgres 18 em localhost:5432, user/senha postgres, db eco)
docker compose up -d

# 1. Backend
cd backend
bun install
cp .env.example .env        # preencha DATABASE_URL, JWT_SECRET e SETUP_TOKEN
bun run db:migrate          # cria as tabelas
bun run dev                 # http://localhost:3333, docs em http://localhost:3333/docs

# 2. Frontend (outro terminal)
cd frontend
pnpm install
cp .env.example .env        # VITE_API_URL=http://localhost:3333
pnpm dev                    # http://localhost:5173
```

## Backend

### Variáveis de ambiente

Todas validadas com Zod no boot (`src/env.ts`); o servidor não sobe com valor inválido. Modelo completo em `backend/.env.example`.

| Variável | Para quê |
|---|---|
| `DATABASE_URL`, `DATABASE_POOL_MAX` | Conexão com o Postgres |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Assinatura e validade do token (`openssl rand -hex 32`) |
| `SETUP_TOKEN` | Token pra criar o primeiro super admin (`openssl rand -hex 24`) |
| `ALLOW_PUBLIC_SIGNUP` | `true`: qualquer um cria conta em `/register`; `false`: só o super admin cria usuários |
| `CORS_ORIGIN` | Origem(ns) do frontend, separadas por vírgula |
| `APP_TIMEZONE` | Fuso dos crons e do conceito de "hoje" (padrão `America/Sao_Paulo`) |
| `JOBS_ENABLED`, `JOBS_RUN_ON_BOOT` | Liga os crons / roda todos no boot pra recuperar janela perdida |
| `RECURRING_LEAD_DAYS`, `REMINDER_DAYS_BEFORE` | Antecedência pra gerar recorrências e pra avisar vencimentos |

### Primeiro acesso (bootstrap)

Num banco novo não existe usuário. Abra o front: ele leva pra tela **Configuração inicial**, onde você informa o `SETUP_TOKEN` do `.env` e cria a conta de **super admin** (já entra logado). Isso acontece uma única vez. Depois, o super admin gerencia contas em **Usuários**; o cadastro público em `/register` fica aberto ou fechado conforme `ALLOW_PUBLIC_SIGNUP`.

Sem front:

```bash
curl -X POST localhost:3333/setup -H "content-type: application/json" \
  -d '{"setupToken":"...","name":"...","email":"...","password":"..."}'
```

### Endpoints principais

A referência completa e interativa fica em `/docs` (Scalar). Todas as rotas, exceto setup, registro e login, exigem `Authorization: Bearer <jwt>` e são escopadas pelo usuário do token.

| Recurso | Rotas |
|---|---|
| Setup | `GET /setup`, `POST /setup` (primeiro super admin) |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Perfil | `GET/PATCH /profile`, `GET/PUT/DELETE /profile/avatar` |
| Usuários (super admin) | `GET/POST /users`, `PATCH /users/:id` |
| Contas | `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/:id` |
| Categorias | `GET/POST /categories`, `PATCH/DELETE /categories/:id` |
| Cartões | `GET/POST /credit-cards`, `GET/PATCH/DELETE /credit-cards/:id` |
| Faturas | `GET /invoices`, `GET /invoices/:id`, `POST /invoices/:id/pay` |
| Lançamentos | `GET/POST /transactions`, `GET/PATCH/DELETE /transactions/:id`, `POST /transactions/:id/pay` |
| Recorrências | `GET/POST /recurring-transactions`, `GET/PATCH/DELETE /recurring-transactions/:id` |
| Notificações | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` |
| Relatórios | `GET /reports/summary?month=YYYY-MM`, `GET /reports/upcoming?days=30` |
| Ativos | `GET/POST /assets`, `PATCH/DELETE /assets/:id` (`?cascade=true` apaga operações e proventos junto) |
| Operações | `GET/POST /asset-trades`, `DELETE /asset-trades/:id` |
| Proventos | `GET/POST /dividends`, `GET /dividends/upcoming`, `PATCH/DELETE /dividends/:id` |

> Valores monetários trafegam em **centavos** (`amountCents: 1990` = R$ 19,90). Datas sem hora são `YYYY-MM-DD`.

### Como o domínio funciona

- **Conta**: saldo = inicial + receitas pagas − despesas pagas − faturas pagas a partir dela.
- **Cartão e fatura**: a compra feita no dia do fechamento ou depois cai na fatura seguinte; compra parcelada gera um lançamento por fatura. Fatura paga não aceita lançamento novo.
- **Lançamento**: pertence a uma conta (`pending`/`paid`/`overdue`) **ou** a um cartão, nunca aos dois.
- **Recorrência**: mensalidades, assinaturas e salário; `auto_pay` faz o débito automático.
- **Relatório mensal**: por competência (data do lançamento). Pagar fatura não é lançamento, então a despesa não duplica.
- **Investimentos**: classes `stock`, `reit` (FII), `crypto`, `currency` e `other`. Posição e preço médio ponderado são calculados na leitura a partir das operações de compra/venda (venda que deixaria a posição negativa é recusada). A cotação é manual. FIIs têm projeção de proventos pela frequência informada.
- **Papéis**: `super_admin` gerencia contas de usuário, mas **não** enxerga dados financeiros alheios.

### Crons

Rodam dentro do próprio processo ([croner](https://github.com/Hexagon/croner)), no fuso `APP_TIMEZONE`:

| Job | Quando | O quê |
|---|---|---|
| `recurring-transactions` | 00:05 | Gera lançamentos de recorrências a vencer |
| `invoices` | 00:10 | Fecha faturas no dia do fechamento e marca vencidas como atrasadas |
| `bills` | 00:15 | Quita débito automático e marca contas vencidas como atrasadas |
| `reminders` | 08:00 | Avisa contas e faturas que vencem em breve |

É seguro rodar com várias réplicas: cada janela diária é reservada no banco (`job_runs`), então só uma instância executa. Rodar manualmente:

```bash
bun run job <nome|all> [--force] [--date=YYYY-MM-DD]
```

### Comandos

Dentro de `backend/`:

| Comando | O quê |
|---|---|
| `bun run dev` | Servidor com watch + crons |
| `bun run start` / `bun run build` | Produção / build em `dist/` |
| `bun run typecheck` | `tsc --noEmit` (o `build` não checa tipo) |
| `bun run test:unit` | Testes de regra pura (`*.unit.test.ts`) |
| `bun run test:integration` | Testes de rota via `app.inject` (precisa de env, não de banco) |
| `bun run db:generate -- --name <nome>` | Gera migration a partir do schema (não toca no banco) |
| `bun run db:migrate` | Aplica as migrations |
| `bun run db:studio` | Drizzle Studio |
| `bun run lint` / `bun run format` | Biome |

## Frontend

Telas:

- **Painel**: resultado do mês, régua de vencimentos, próximos vencimentos e gasto por categoria.
- **Lançamentos**: extrato por dia, filtros e compra parcelada no cartão.
- **Contas**, **Cartões e faturas** (com pagamento de fatura), **Recorrências** (pausar/retomar) e **Categorias**.
- **Investimentos**: carteira com alocação por classe, operações de compra/venda, cotação manual e proventos do mês.
- **Central de avisos** e **Perfil** (dados, senha e avatar).
- **Usuários** (somente super admin).

Tema claro/escuro e layout de celular com barra inferior.

| Comando | O quê |
|---|---|
| `pnpm dev` | Dev server em http://localhost:5173 |
| `pnpm typecheck` | `tsc -b` |
| `pnpm build` | Typecheck + build de produção |
| `pnpm preview` | Serve o build localmente |
| `pnpm lint` / `pnpm format` | Biome |

## Segurança

- Nunca versione `.env`, credenciais ou tokens (já ignorados pelo `.gitignore`).
- Troque `JWT_SECRET` e `SETUP_TOKEN` por valores aleatórios longos antes de publicar.
- Senhas são guardadas com argon2; o login tem rate limit e o status do usuário é checado no banco a cada request (bloqueio vale na hora).
