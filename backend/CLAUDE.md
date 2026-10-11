# Backend, Eco API

Bun + Fastify 5 + Drizzle ORM (driver `postgres` / postgres.js) + PostgreSQL + Zod 4 + Scalar (`/docs`) + croner. Lint/format com Biome.

## Comandos (rodar dentro de `backend/`)

| Comando | O quê |
|---|---|
| `bun run dev` | Servidor com watch (porta `PORT`, default 3333) + crons |
| `bun run typecheck` | `tsc --noEmit` (o `build` não checa tipo) |
| `bun run test:unit` | Testes de regra pura (`*.unit.test.ts`) |
| `bun test routes.test` | Testes de rota via `app.inject` (precisa de env, não de banco) |
| `bun run db:generate -- --name <nome>` | Gera migration a partir do schema (não toca no banco) |
| `bun run db:migrate` | Aplica migrations, **só com confirmação explícita** (skill `db-migrate`) |
| `bun run job <nome\|all> [--force] [--date=YYYY-MM-DD]` | Roda um cron manualmente |
| `bun run lint` / `bun run format` | Biome |

## Estrutura

```
src/
  main.ts                # listen + scheduler + shutdown gracioso
  server.ts              # buildApp(): plugins, docs, registro de rotas (usado pelos testes)
  env.ts                 # validação Zod do process.env (falha no boot)
  lib/                   # db, errors (AppError/handleError), auth (JWT/argon2), dates, billing, money, logger
  middlewares/           # authMiddleware / protectedRoute
  schemas/responses.ts   # envelopes de erro e helpers Zod compartilhados
  db/schema/<tabela>/<tabela>.schema.ts + enums.ts + columns.ts + index.ts (barrel)
  modules/<recurso>/     # <recurso>.routes.ts, .controller.ts, .service.ts, schemas/<singular>.schema.ts|.response.ts
  jobs/                  # crons: job-runner, scheduler, cli e um *.job.ts por cron
drizzle/                 # migrations SQL versionadas
```

## Convenções

- **Escopo por usuário**: todo recurso tem `user_id`; todo service recebe `userId` como 1º parâmetro e filtra por ele. Id de recurso relacionado vindo do client passa por `findOwned*` do módulo dono (404 se não for do usuário).
- Rotas e controllers: `export async function`. Services, guards, helpers: arrow functions. Sem classes (exceto `AppError`), sem DI, sem repository genérico.
- Controller: `schema.parse()` -> service -> `reply.send({ success: true, message: "<pt-BR>", <recurso> })`, try/catch com `handleError(reply, error, req)`.
- Rota: `onRequest: protectedRoute`, `schema.tags/summary/security`, `response` completo por status code (`errors[...]`), handler `as any`.
- Erro de domínio: `throw new AppError("<pt-BR>", status)`. Unique/FK violada do Postgres vira 409 no `handleError`.
- Guard `onRequest` é `async` e **lança** `AppError(401)` em vez de `reply.send()` (no Bun o Fastify às vezes segue pro handler depois do send dentro do hook).
- Input em `.schema.ts`, output em `.response.ts`. Zod 4: `z.email()`, `z.iso.date()`, `z.enum(values)`, `.pipe()` pra trim+formato.
- **Dinheiro sempre em centavos inteiros** (`*Cents`). Data sem hora = string `YYYY-MM-DD` (coluna `date` mode string); "hoje" = `todayIn(env.APP_TIMEZONE)`.
- Dentro de `db.transaction(async (tx) => ...)` passe `tx` pra toda função chamada (parâmetro `executor: DbOrTx`), nunca `db`.
- Cache Redis **opcional** (`REDIS_URL`, cliente nativo do Bun em `lib/redis.ts`; `lib/cache.ts` com `cached(userId, name, params, loader)`). Fail-open: erro/ausência de Redis cai no Postgres. Invalidação por versão por usuário: hook `onSend` em `server.ts` incrementa o contador após toda escrita autenticada com sucesso; os crons (`job-runner`) invalidam tudo via contador global; `CACHE_TTL_SECONDS` padrão 1h. Timestamps ISO voltam como `Date` (reviver em `cache.ts`). Cacheie só funções de leitura chamadas por GET, nunca as usadas em caminho de escrita (ex: `listAssetViews`); resultado que depende de "hoje" leva a data na chave. Todo GET autenticado é cacheado (relatórios, contas, cartões, faturas, ativos, operações, proventos, lançamentos, categorias, recorrências, notificações, `/auth/me`, `/profile`, `/users`), exceto `/profile/avatar` (binário até ~4 MB, já revalida por `cache-control`), `/health`, `/setup` e o `authMiddleware` (precisa ver bloqueio na hora). `/users` usa a chave `system` e escrita na tabela `users` chama `invalidateAllCache()`. Função de leitura nova: embrulhar com `cached()` e garantir que nenhuma escrita a chama. Rate limit do login é em memória (por réplica).

## Bootstrap e papéis

- Primeiro acesso: `GET /setup` diz se já há super admin; `POST /setup` (com `SETUP_TOKEN` do env, rate limit 5/min) cria o **super admin** e já devolve o JWT. Linha única em `system_setup` (PK + check), uma vez concluído, nunca reabre.
- Antes do setup, `/auth/register` responde 403. Depois, o cadastro público depende de `ALLOW_PUBLIC_SIGNUP`.
- Papéis: `super_admin` (gerencia contas em `/users`: criar, bloquear, promover, redefinir senha) e `user`. Super admin **não** enxerga dados financeiros alheios, todo o resto continua escopado por `userId`.
- Guards: `protectedRoute` (autenticado + ativo, status checado no banco a cada request: bloqueio vale na hora) e `superAdminRoute`. Anti-lockout: ninguém tira o próprio acesso de admin e sempre sobra um super admin ativo.
- Criar conta (cadastro, setup ou admin) sempre via `createUserAccount` dentro de transaction, ela cria as categorias padrão junto.

## Domínio

- **Conta** (`accounts`): saldo = inicial + receitas pagas − despesas pagas − faturas pagas a partir dela.
- **Cartão** (`credit_cards`) + **fatura** (`invoices`): compra no dia do fechamento ou depois cai na fatura seguinte; `reference_month` = mês do vencimento. Regra pura em `lib/billing.ts` (`resolveInvoiceCycle`). Fatura `paid` não aceita lançamento novo/alterado (409).
- **Lançamento** (`transactions`): em conta (pending/paid/overdue) **ou** cartão (XOR por `check`). Compra parcelada gera N lançamentos, um por fatura, com `installment_group_id`.
- **Recorrência** (`recurring_transactions`): mensalidades/assinaturas/salário. `next_run_date` avança com dia âncora (31 -> 28/fev -> 31/mar). `auto_pay` = débito automático.
- **Notificação** (`notifications`): gerada pelos crons, idempotente por `dedupe_key`.
- Relatório mensal é por competência (data do lançamento); pagamento de fatura não é lançamento, então não duplica despesa.

## Crons (`src/jobs/`, fuso `APP_TIMEZONE`)

| Job | Quando | O quê |
|---|---|---|
| `recurring-transactions` | 00:05 | Gera lançamentos de recorrências com vencimento até hoje + `RECURRING_LEAD_DAYS` (inclui atrasadas) |
| `invoices` | 00:10 | Fecha faturas no dia do fechamento; marca vencidas não pagas como `overdue`; notifica |
| `bills` | 00:15 | Quita débito automático vencido; marca contas pendentes vencidas como `overdue`; notifica |
| `reminders` | 08:00 | Avisa contas/faturas que vencem em até `REMINDER_DAYS_BEFORE` dias |

- Cada execução reserva a janela `(job_name, run_key=data)` em `job_runs`, com N réplicas só uma roda; `failed` (ou `running` travado > 1h) pode ser retomada.
- `JOBS_RUN_ON_BOOT=true` roda todos no boot pra recuperar janela perdida (sem duplicar).
- Job novo: criar `src/jobs/<nome>.job.ts` exportando `JobDefinition`, registrar em `src/jobs/index.ts` na ordem certa, e garantir idempotência (update condicional, unique ou `dedupe_key`).

## Ambiente local

- Windows App Control desta máquina bloqueia `biome.exe` (`bun run lint` falha com "spawnSync UNKNOWN"), limitação do ambiente, não do código.
