# Frontend, Eco

SPA Vite + React 19 + TanStack Router (file-based) + TanStack Query + shadcn/ui (Base UI) + Tailwind v4 + Motion. Segue o skill `frontend-standards`; abaixo só o que é específico deste projeto.

## Comandos (dentro de `frontend/`, pnpm)

| Comando | O quê |
|---|---|
| `pnpm dev` | Dev server em http://localhost:5173 (API em `VITE_API_URL`, default http://localhost:3333) |
| `pnpm typecheck` | `tsc -b` (precisa do `src/routeTree.gen.ts`, gerado pelo plugin do router no `dev`/`build`) |
| `pnpm build` | typecheck + build de produção |
| `pnpm lint` / `pnpm format` | Biome (bloqueado nesta máquina pelo Windows App Control, ver `backend/CLAUDE.md`) |

## Estrutura

```
src/
  routes/            __root.tsx (providers), login, register, _app.tsx (layout autenticado) e _app/<página>.tsx
  components/
    ui/              primitivos shadcn (não editar à mão além de ajustes pontuais; biome ignora a pasta)
    <Domínio>/       Accounts, Categories, CreditCards, Dashboard, Notifications, RecurringTransactions, Transactions
    *.tsx            genéricos: money, animated-money, money-input, option-select, month-picker, page-header...
  hooks/             um hook por recurso (tipos + schemas Zod + CRUD com toast)
  lib/               api (axios + apiError), format, mutation (withToast/invalidateMoney), query-client, auth-storage
```

## Convenções do projeto

- **Dinheiro**: a API trafega centavos (`*Cents`). Exibir com `<Money>`/`<AnimatedMoney>`; editar com `<MoneyInput>` (digitação estilo maquininha). Nunca float.
- **Datas sem hora** ("YYYY-MM-DD"): formatar com `formatDate` (usa `parseISO`, não volta um dia por fuso). Texto que começa frase passa por `capitalizeFirst`, nunca a classe CSS `capitalize` (português não capitaliza "de").
- **Select**: sempre `<OptionSelect>` (passa `items` pro Base UI e trata opção vazia como `null`).
- **Data**: sempre `<DatePicker>` (shadcn Calendar em Popover, pt-BR), nunca `<input type="date">`. Trafega "YYYY-MM-DD" ("" = vazio) via `Controller`; `clearable` em campo opcional.
- **Dialog em 3 partes**: `DialogHeader` / `DialogBody` / `DialogFooter`. Só o `DialogBody` (ScrollArea) rola; o `DialogContent` já tem `max-h` + `overflow-hidden`, não sobrescrever. Com `<form>`, usar `className="contents"` pra ele não quebrar a coluna flex.
- **Altura dos controles**: input, select, botão, tabs e seletor de mês = `h-8`. Não sobrescrever altura por tela.
- **`Button`/`DropdownMenuItem` renderizando `<Link>`**: `nativeButton={false}` no `Button` (Base UI avisa no console).
- **Mutations**: `withToast` (loading -> sucesso/erro) e `invalidateMoney`, lançamento/fatura/recorrência mexem em saldo, limite, relatórios e notificações juntos.
- **Auth**: JWT no `localStorage` (`eco.token`), `Authorization: Bearer`; 401 fora do login derruba a sessão e manda pra `/login?expired=1`. Guarda de rota em `_app.tsx` (`beforeLoad`).
- **Mês selecionado** vive na URL (`?month=YYYY-MM`) no painel e em lançamentos.

## Visual

- **Paleta restrita a duas escalas do Tailwind: `neutral` e `emerald`** (pedido do produto), com uma exceção: `destructive` = vermelho (red-600 claro / red-400 escuro), só pra ação destrutiva, erro de formulário e toast de erro. Nada de amarelo/azul nem vermelho fora disso. Tokens em `src/index.css` com o passo anotado (`/* emerald-700 */`); não criar cor fora dali.
- Semântica de dinheiro sem vermelho: entrada/pago/primário = esmeralda; saída = neutro (o sinal "−" diferencia); atrasado = badge invertido (`bg-foreground text-background`) + ícone ⚠ + rótulo. Ação destrutiva: item de menu `variant="destructive"`, botão de lixeira com hover vermelho, confirmação final em vermelho sólido (`ConfirmDeleteDialog`).
- Gráficos: `chart-expense` (neutral-600 claro / neutral-500 escuro) e `chart-income` (emerald-600 / emerald-500), validados no `dataviz` (CVD ≥ 14; o "chroma floor" falha por definição no cinza, a posição no eixo compensa). Na régua, contas e faturas são uma série só ("Saídas").
- Cores de categoria só de `CATEGORY_COLORS` (passos emerald/neutral); bolinha de categoria sempre com a classe `swatch` (contorno pra tons escuros não sumirem no tema escuro).
- Tipografia: Bricolage Grotesque (títulos), Figtree (texto), IBM Plex Mono via utilitário `money` (valores em colunas). Número de destaque usa `<AnimatedMoney variant="hero">` (sans proporcional).
- Elemento-assinatura: **régua do mês** (`components/Dashboard/month-ruler.tsx`), um eixo, despesas/faturas acima, receitas abaixo, tom claro = em aberto, marcador "hoje".
- **Motion** com moderação: `MotionConfig reducedMotion="user"` na raiz; animações de entrada (régua, barras, listas em stagger), `layoutId` no item ativo da navegação/fatura e contagem de valores. Nada de animação em loop.
