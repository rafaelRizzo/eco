---
name: env-check
description: Confere backend/.env contra backend/.env.example (chave faltando, placeholder não trocado) sem expor segredo. Use antes de bun run dev, de rodar migration, ou quando o usuário reportar erro de variável de ambiente.
---

# env-check

Evita o "esqueci de configurar X" descoberto só em runtime (o `src/env.ts` derruba o boot, mas a mensagem chega tarde). **Nunca imprime valor de segredo**, só nome de chave e status.

## Passo a passo

1. Se `backend/.env` não existir: copie de `backend/.env.example` e avise que os valores precisam ser preenchidos. Nunca invente `DATABASE_URL`, peça ao usuário.

2. Compare as **chaves** (não os valores):
   - chave do `.env.example` ausente no `.env` -> bloqueante (exceto as que têm default em `src/env.ts`, que viram aviso);
   - chave no `.env` que não existe no `.env.example` -> aviso.

3. Placeholder não trocado:
   - `JWT_SECRET=change-me` ou com menos de 32 chars -> bloqueante. Sugira `openssl rand -hex 32`, mas não gere e grave sozinho sem o usuário pedir.
   - `SETUP_TOKEN=change-me` ou com menos de 24 chars -> bloqueante (o boot falha). Sugira `openssl rand -hex 24`. Depois do `/setup` concluído ele não serve pra mais nada, mas continua obrigatório no env.
   - `ALLOW_PUBLIC_SIGNUP`: só informe o valor (true = qualquer um cria conta depois do setup; false = só o super admin cria).
   - `DATABASE_URL` igual ao exemplo (`postgres:postgres@localhost`) -> aviso "não usar em produção".

4. Nunca imprima `JWT_SECRET`, `SETUP_TOKEN` nem a senha contida no `DATABASE_URL` (no máximo host e nome do banco).

5. Reporte: lista de chave por status (ok / faltando / placeholder / extra). Se tudo ok, uma frase e pare.
