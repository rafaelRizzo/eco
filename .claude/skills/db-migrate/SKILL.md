---
name: db-migrate
description: Fluxo seguro de migration do Drizzle no backend (generate -> revisão do SQL -> confirmação -> migrate). Use sempre que houver mudança em backend/src/db/schema/**/*.schema.ts que precise ir pro banco.
---

# db-migrate

Drizzle nunca aplica migration sozinho. Este skill existe pra nunca pular a confirmação humana (regra fixa do `backend/CLAUDE.md`).

## Passo a passo

1. Confirme que a mudança em `backend/src/db/schema/**/*.schema.ts` está salva e é a versão final. Opcional: peça revisão ao agente `db-schema-reviewer`.

2. `cd backend && bun run db:generate -- --name <descricao_curta>`, cria `drizzle/NNNN_<descricao>.sql`, não toca no banco.

3. **Mostre o SQL gerado pro usuário** e aponte especificamente:
   - `DROP COLUMN`/`DROP TABLE` (perda de dado);
   - coluna nova `NOT NULL` sem `DEFAULT` numa tabela que já tem linhas (falha em produção);
   - mudança de tipo de coluna;
   - `DROP CONSTRAINT` + `ADD CONSTRAINT` de FK sem motivo (nome > 63 chars truncado pelo Postgres, corrija com `foreignKey({ name })`).

4. **Pare e peça confirmação explícita.** Nunca rode `db:migrate` no mesmo turno sem essa confirmação, mesmo que o usuário tenha pedido "migra o banco" antes de ver o SQL.

5. Só depois da confirmação: `cd backend && bun run db:migrate` (usa `DATABASE_URL` do `backend/.env`).

6. Se falhar no meio, pare e reporte o erro exato. Não tente "corrigir" com outro comando destrutivo sem pedir permissão.

## Nunca

- Nunca `drizzle-kit push` (não deixa histórico versionado).
- Nunca editar/apagar migration já aplicada em algum banco; crie uma nova.
- Nunca `DROP`/reset de banco pra resolver conflito de migration sem confirmação explícita.
