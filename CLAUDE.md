# Eco, controle de gastos (MVP)

Monorepo com dois projetos independentes (cada um com seu `package.json`, sem workspace compartilhado):

- `backend/`, API REST (Bun + Fastify 5 + Drizzle + Postgres + Zod 4 + Scalar) e crons. Convenções em `backend/CLAUDE.md`.
- `frontend/`, SPA Vite + React 19 + TanStack Router/Query + shadcn/ui (Base UI) + Tailwind v4 + Motion (pnpm). Convenções em `frontend/CLAUDE.md` e no skill `frontend-standards`.

## Regras gerais

- Código (nomes, arquivos, branches) em inglês; comentários, mensagens de API e commits em pt-BR.
- Todo arquivo começa com 1-2 linhas de comentário em pt-BR dizendo o que faz.
- Commits: Conventional Commits em pt-BR com escopo `back`/`front`/`full` (skill `commit`).
- Nunca rodar migration, `DROP`, `DELETE` amplo ou qualquer comando destrutivo em banco sem confirmação explícita.
- Nunca versionar `.env`, credenciais ou tokens.

## Skills e agentes do projeto (`.claude/`)

Trazidos do catálogo do Notion (padrão `sdk-bun-drizzle-scalar`) e adaptados a este projeto (escopo por usuário, sem multi-tenant e sem Redis).

| Nome | Tipo | Uso |
|---|---|---|
| `new-module` | skill | Gera módulo backend novo (routes/controller/service/schemas/tests) |
| `db-migrate` | skill | Fluxo seguro de migration Drizzle (generate -> revisão -> confirmação -> migrate) |
| `env-check` | skill | Valida `backend/.env` contra `.env.example` sem expor segredo |
| `frontend-standards` | skill | Padrão do frontend (Vite + React + TanStack + shadcn/ui) |
| `db-schema-reviewer` | agente | Revisa schema Drizzle antes de gerar migration |
| `api-docs-reviewer` | agente | Audita contrato rota x Zod x Scalar |
| `test-writer` / `test-runner` | agentes | Escreve / roda testes do backend |
| `build-checker` | agente | Typecheck + build |
| `dependency-auditor` | agente | `bun audit`, só relata |
| `security-reviewer` | agente | Isolamento entre usuários, auth, segredo, injeção |
