---
name: new-module
description: Gera um módulo novo no backend (routes/controller/service/schemas/tests) seguindo o padrão do projeto. Use quando o usuário pedir um recurso/CRUD novo (ex: "cria um módulo de metas", "adiciona orçamentos").
---

# new-module

Gera um módulo em `backend/src/modules/<nome>/` seguindo exatamente o padrão de `accounts/` e `credit-cards/` (use os dois como referência literal de código, não invente sintaxe nova). Adaptado do padrão `sdk-bun-drizzle-scalar` (Notion), **sem** multi-tenant e **sem** Redis: aqui o escopo é sempre o usuário do token.

## Passo a passo

1. **Nome do recurso**: se o usuário não disse, pergunte. Diretório plural kebab-case (`budgets`), schemas singular (`schemas/budget.schema.ts` + `schemas/budget.response.ts`), tabela Drizzle plural snake_case (`budgets`).

2. **Antes de escrever código, confirme**:
   - Quais campos e quais relações (conta? categoria? cartão?).
   - Regra de exclusão: bloquear com 409 se houver dependentes (padrão de `accounts`) ou cascade?
   - Precisa de cron? Se sim, veja `backend/src/jobs/` e siga a seção "Crons" do `backend/CLAUDE.md`.

3. **Tabela Drizzle** em `backend/src/db/schema/<tabela>/<tabela>.schema.ts`:
   - `id: id()`, `createdAt: createdAt()`, `updatedAt: updatedAt()` de `../columns`.
   - `userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" })` + `index("<tabela>_user_id_idx")`.
   - Toda FK com `index(...)`. Dinheiro em `integer` centavos (`*Cents`). Data sem hora em `date(..., { mode: "string" })`.
   - Nome de FK gerado > 63 chars: use `foreignKey({ name: ... })` explícito (ver `transactions.schema.ts`).
   - Enum novo em `db/schema/enums.ts` exportando também o array `*Values` (Zod usa).
   - Exportar em `backend/src/db/schema/index.ts`.

4. **Dois arquivos de schema, nunca um só**: `.schema.ts` com `create<Nome>Schema`, `update<Nome>Schema` (`.partial().refine(...)` exigindo ao menos 1 campo), `<nome>QuerySchema` e tipos `*Input`; `.response.ts` com `<Nome>Schema` + `Create/Get/Update/List<Nome>Response`. Zod 4 sempre (`z.email()`, `z.iso.date()`, `z.enum(values)`).

5. **`<nome>.service.ts`**: arrow functions soltas, `db` de `lib/db`, primeiro parâmetro sempre `userId`. Exponha `findOwned<Nome>(userId, id, executor = db)` que lança `AppError(..., 404)`. Toda query filtra por `userId`. Recurso relacionado vindo do client (ex: `accountId`) **sempre** validado com o `findOwned*` do módulo dono. `db.transaction` se houver mais de um write, e dentro dela passe `tx` pra toda chamada (nunca `db`).

6. **`<nome>.controller.ts`**: `export async function`, try/catch + `handleError(reply, error, req)`, `schema.parse(...)`, `req.user.id`, `reply.send({ success: true, message: "<pt-BR>", <recurso>: resultado })`.

7. **`<nome>.routes.ts`**: `onRequest: protectedRoute`, `schema.tags/summary/security: bearerSecurity`, `response` completo por status code com `errors[...]` de `src/schemas/responses.ts`. Handler com `as any`.

8. **Registrar** em `backend/src/server.ts` dentro do bloco encapsulado do helmet: `await api.register(<nome>Routes)`.

9. **Testes**: regra pura nova vai pra `lib/` com `*.unit.test.ts`; adicione os endpoints novos em `src/modules/__tests__/protected.routes.test.ts` (401 sem token). Delegue pro agente `test-writer`.

10. **Migration**: siga o skill `db-migrate` (nunca aplique sem confirmação).

11. Ao terminar, rode `cd backend && bun run typecheck && bun run test:unit`.
