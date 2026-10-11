---
name: frontend-standards
description: Padrão de código pessoal para frontends novos - Vite + React 19 + TanStack Router/Query + shadcn/ui + Tailwind v4. Use ao iniciar o frontend/ deste monorepo ou ao criar tela/componente/hook novo nele.
---

# Frontend Standards (Vite + React + TanStack + shadcn/ui)

Padrão extraído de `sofon-pabx/frontend` (cópia da biblioteca de skills pessoais no Notion). SPA, não Next.js - sem app router, sem server components, sem server actions.

## Stack fixo

| Camada | Escolha |
|---|---|
| Build | Vite + React 19 |
| Roteamento | `@tanstack/react-router` (file-based, `src/routes/`) |
| Server state | `@tanstack/react-query` v5 (nunca fetch+useEffect manual, exceto exceção documentada) |
| UI | shadcn/ui sobre `@base-ui/react` (Base UI, não Radix), ícones `lucide` |
| Estilo | Tailwind v4, CSS-first (`@theme inline`, sem `tailwind.config.js`) |
| Forms | `react-hook-form` + `zod` via `@hookform/resolvers/zod` |
| HTTP | instância `axios` única (não fetch cru) |
| Pkg manager | pnpm |
| Lint/Format | Biome (lint + format num tool só) |
| Outros | `date-fns`, `sonner` (toast), `clsx`+`tailwind-merge` (`cn()`), `class-variance-authority` |

`tsconfig`: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. Alias `@/*` -> `./src/*`.

## Idioma e comentários

- Código: sempre em inglês. Comentário: sempre em pt-BR. Texto visível ao usuário: pt-BR.
- Todo arquivo começa com um comentário de 1-2 linhas em pt-BR dizendo o que ele faz. Fora isso, comentário só explica o porquê não-óbvio.

## Arrow function vs `function`

- Componente React: sempre `export function X(...)`, nunca arrow, nunca default export.
- Tudo mais - hook interno, callback, helper de `lib/`, handler de evento - usa arrow function.

## shadcn/ui

- Inicializar com `pnpm dlx shadcn@latest init -b base`, manter `components.json` versionado. Não redefinir token em outro arquivo.
- **Antes de implementar qualquer elemento de UI na mão, checar se já existe primitivo shadcn** (`pnpm dlx shadcn@latest add <nome>`): `dialog`, `sheet`, `popover`, `command`, `tabs`, `alert`, `badge`, `skeleton`, `select`, `calendar`, `table`...
- Variante nova de componente existente estende o `cva` já presente.
- **`<Select>` (Base UI) sobre enum traduzido: sempre passar `items={labelsMap}` na raiz**, senão o trigger fechado mostra o valor bruto do enum em vez do label.
- Não usar `"use client"`. Não usar husky/lint-staged/pre-commit.

## Primitivos shadcn (Base UI): ajustes que todo projeto leva

Feitos uma vez no `components/ui/*`, nunca repetidos por tela.

- **Altura única de controle: `h-8`** (input, select, botão, tabs, toolbar tipo seletor de mês). Não sobrescrever por tela: o `SelectTrigger` tem `data-[size=default]:h-8`, que vence um `h-9` passado via className por especificidade, e o controle fica desalinhado sem ninguém perceber. Texto de input/textarea `text-sm` (o default `text-base md:text-sm` deixa o input maior que o select no mobile; custo: zoom automático no foco do iOS).
- **Dialog em 3 partes: header fixo, `DialogBody` rolável, footer fixo.** No `ui/dialog.tsx`: `DialogContent` = `flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden` (sem `p-4`/`gap-4`/`grid`); `DialogHeader` = `shrink-0 p-4 pr-12` (espaço pro X); `DialogFooter` = `shrink-0 border-t p-4` (sem `-mx-4 -mb-4`); `DialogBody` novo = `ScrollArea` com `className="flex min-h-0 flex-1 flex-col"`, viewport `min-h-0 flex-1` e div interna `px-4 pt-0.5 pb-4` (folga pro ring de foco não ser cortado). O `ui/scroll-area.tsx` ganha a prop `viewportClassName`. Em dialog com form: `<form className="contents">` envolvendo header/body/footer, pra não quebrar a coluna flex. Nunca `overflow-y-auto` no `DialogContent`: o scroll nativo compete com o ScrollArea e arrasta header/footer.
- **Tabs com indicador deslizante**: `TabsList` renderiza `<TabsPrimitive.Indicator>` (só na variante `default`) com `absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) transition-[left,width] duration-200 ease-out motion-reduce:transition-none` + o visual do ativo (`bg-background shadow-sm`, `dark:border-input dark:bg-input/30`). O `TabsList` leva `relative isolate`, o `TabsTrigger` leva `z-[1]` e perde `data-active:bg-*`/`border`/`shadow` (fica só a cor do texto).
- **Select abre abaixo do campo**: `alignItemWithTrigger={false}` no `SelectContent` (o default do Base UI sobrepõe o popup ao trigger e parece desalinhado) e itens dentro de `<SelectGroup>` (dá o `p-1` entre borda e item). `SelectPrimitive.ItemText` com `items-center`. Lista com bolinha de cor: opção sem cor reserva o mesmo espaço (círculo vazado em "nenhum", spacer nas demais) pro texto alinhar.
- **Campo de data: nunca `<input type="date">`** (popup nativo do navegador destoa do tema e não segue o locale). `components/date-picker.tsx`: `PopoverTrigger` estilizado igual ao input (`h-8`, mesmas classes de borda/foco/`aria-invalid`) + `Calendar` (`pnpm dlx shadcn@latest add calendar`, react-day-picker) com `locale={ptBR}` do date-fns, caption capitalizada via `formatters.formatCaption`, e rodapé com "Hoje" e "Limpar" (só com `clearable`). Valor continua string `"YYYY-MM-DD"` (`""` = vazio, `parseISO` na ida, `format` na volta), então o schema Zod (`z.iso.date()`) não muda; no form, `Controller` em vez de `register`.
- **Toolbar composta (ex: ‹ mês ›)** segue a anatomia das tabs: `h-8 rounded-lg border p-[3px]`, botões `icon-xs`, rótulo `flex-1 min-w-*` (quando o pai estica no mobile, as setas vão pras pontas e o texto centraliza).

## Estrutura de pastas

~~~
src/
  routes/                 # file-based do TanStack Router (__root.tsx, dashboard.tsx, dashboard/x.tsx, x.index.tsx, x.$id.tsx)
  components/
    ui/                   # primitivos shadcn
    Transactions/         # PascalCase por domínio; arquivos kebab-case dentro
    page-header.tsx       # genérico: direto em components/
  hooks/                  # um arquivo por recurso: use-transactions.ts
  lib/                    # api.ts, utils.ts
~~~

Rota, hook e pasta de componente do mesmo recurso têm o mesmo nome.

## Componentes

- Props: `type Props = {...}` (nunca `interface`), destructuring na assinatura; união discriminada pra create vs edit.
- Um componente por arquivo. Tipos/schemas do domínio ficam no hook dono da entidade.
- Tabela (presentacional) separada do dialog de formulário; a página orquestra os dois + confirmação de delete.

## Hooks de recurso

Um hook por recurso encapsula o CRUD: `useQuery` + `useMutation` com `invalidateQueries`, retorno objeto plano sempre com `loading`, mutation retorna `Promise<boolean>` (ou a entidade no create), padrão de toast `toast.loading -> mutateAsync -> toast.success/error` (nunca silencioso). Tipos e schemas Zod exportados do próprio arquivo do hook.

## Data fetching

- Uma instância `axios` (`lib/api.ts`), `baseURL` de env de build (`VITE_API_URL`). O backend deste projeto usa `Authorization: Bearer <token>` (JWT de `POST /auth/login`).
- `apiError(err, fallback)` central: erros de validação do backend (`errors[]`) > mensagem do backend (`message`) > fallback por status > fallback de rede.
- `QueryClient` único: `retry: false`, `refetchOnWindowFocus: false`, `QueryCache.onError` global.
- Valores monetários chegam em centavos (`*Cents`): formatar só na borda (`Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`).

## Estilo e estado

- Tailwind v4 CSS-first, tokens em `oklch()`, dark mode via `.dark`, `ThemeProvider` custom. `cn()` pra classe condicional. Cor semântica sempre.
- Server state: TanStack Query. UI local: `useState`. Global só `AuthProvider`/`ThemeProvider`. Form: sempre `react-hook-form`.
- `type` sempre, nunca `interface`; tipo de form = `z.infer` do schema.
- Nunca deixar o projeto sem `lint`/`format`/`typecheck` desde o commit inicial.
