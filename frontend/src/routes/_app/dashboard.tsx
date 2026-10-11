// Painel: resultado do mês em destaque, régua do mês (vencimentos por dia), próximos vencimentos e gasto por categoria.
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRightIcon, PlusIcon } from "lucide-react"
import { motion } from "motion/react"
import { useMemo } from "react"
import { z } from "zod"
import { AnimatedMoney } from "@/components/animated-money"
import { useAuth } from "@/components/auth-provider"
import { CategoryBreakdown } from "@/components/Dashboard/category-breakdown"
import { MonthRuler } from "@/components/Dashboard/month-ruler"
import { UpcomingList } from "@/components/Dashboard/upcoming-list"
import { MonthPicker } from "@/components/month-picker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAccounts } from "@/hooks/use-accounts"
import { useCreditCards } from "@/hooks/use-credit-cards"
import { useDividends, useDividendsDue } from "@/hooks/use-dividends"
import { useAllInvoices } from "@/hooks/use-invoices"
import { useMonthlySummary, useUpcoming } from "@/hooks/use-reports"
import { useTransactions } from "@/hooks/use-transactions"
import { currentMonthKey, formatMonth } from "@/lib/format"

export const Route = createFileRoute("/_app/dashboard")({
    staticData: { crumb: "Painel" },
    validateSearch: z.object({
        month: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional()
            .catch(undefined),
    }),
    component: DashboardPage,
})

const greeting = () => {
    const hour = new Date().getHours()
    return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"
}

function DashboardPage() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    const month = search.month ?? currentMonthKey()

    const { user } = useAuth()
    const { summary, loading: summaryLoading } = useMonthlySummary(month)
    const { upcoming } = useUpcoming(30)
    const { transactions } = useTransactions({ month })
    const { invoices } = useAllInvoices()
    const { creditCards } = useCreditCards()
    const { accounts, loading: accountsLoading } = useAccounts()
    const { totals: dividendTotals } = useDividends(month)
    const { dueCount, dueCents } = useDividendsDue()

    const cardNames = useMemo(() => new Map(creditCards.map((card) => [card.id, card.name])), [creditCards])
    const firstName = user?.name.split(" ")[0]

    if (!accountsLoading && accounts.length === 0) return <Onboarding name={firstName} />

    return (
        <>
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h1 className="font-semibold text-3xl sm:text-4xl">
                        {greeting()}
                        {firstName ? `, ${firstName}` : ""}
                    </h1>
                    <p className="text-muted-foreground text-sm">Resumo de {formatMonth(month)}</p>
                </div>
                <MonthPicker month={month} onChange={(next) => navigate({ search: { month: next }, replace: true })} />
            </header>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-3xl border bg-card p-6">
                    <p className="text-muted-foreground text-sm">Resultado do mês</p>
                    {summaryLoading || !summary ? (
                        <Skeleton className="mt-2 h-14 w-64" />
                    ) : (
                        <AnimatedMoney
                            cents={summary.netCents}
                            variant="hero"
                            className="mt-1 block text-5xl sm:text-6xl"
                        />
                    )}
                    <p className="mt-2 text-muted-foreground text-sm">Entradas menos saídas com data neste mês.</p>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border">
                    <StatTile label="Entradas" cents={summary?.incomeCents} hint={summary ? `recebido ${formatShort(summary.paidIncomeCents)}` : undefined} />
                    <StatTile label="Saídas" cents={summary?.expenseCents} hint={summary ? `pago ${formatShort(summary.paidExpenseCents)}` : undefined} />
                    <div className="col-span-2 bg-card p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">Saldo nas contas hoje</p>
                            <Link to="/accounts" className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground">
                                {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
                                <ArrowRightIcon className="size-3" />
                            </Link>
                        </div>
                        {summary ? <AnimatedMoney cents={summary.totalBalanceCents} variant="hero" className="text-3xl" /> : <Skeleton className="mt-1 h-9 w-40" />}
                    </div>
                    {dividendTotals.totalCents > 0 ? (
                        <div className="col-span-2 bg-card p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">Proventos que entraram</p>
                                <Link
                                    to="/investments"
                                    search={{ tab: "dividends", month }}
                                    className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                                >
                                    ver proventos
                                    <ArrowRightIcon className="size-3" />
                                </Link>
                            </div>
                            <AnimatedMoney cents={dividendTotals.receivedCents} variant="hero" className="text-3xl" />
                            {dueCount > 0 ? (
                                <Link
                                    to="/investments"
                                    search={{ tab: "dividends" }}
                                    className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-foreground px-3 py-2 text-background text-xs"
                                >
                                    <span>
                                        {dueCount === 1 ? "1 provento" : `${dueCount} proventos`} p/ confirmar ·{" "}
                                        {formatShort(dueCents)}
                                    </span>
                                    <ArrowRightIcon className="size-3 shrink-0" />
                                </Link>
                            ) : null}
                            <p className="mt-1 text-muted-foreground text-xs">
                                a receber {formatShort(dividendTotals.pendingCents)}
                                {dividendTotals.estimatedCents > 0
                                    ? ` · estimado ${formatShort(dividendTotals.estimatedCents)}`
                                    : ""}
                            </p>
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="rounded-3xl border bg-card p-6">
                <div className="mb-6 flex items-baseline justify-between gap-4">
                    <h2 className="font-semibold text-xl">Régua do mês</h2>
                    <p className="hidden text-muted-foreground text-sm sm:block">Passe o mouse num dia pra ver o que vence nele</p>
                </div>
                <MonthRuler month={month} transactions={transactions} invoices={invoices} cardNames={cardNames} />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border bg-card p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="font-semibold text-xl">Próximos vencimentos</h2>
                        <span className="text-muted-foreground text-xs">30 dias</span>
                    </div>
                    {upcoming ? <UpcomingList upcoming={upcoming} cardNames={cardNames} /> : <Skeleton className="h-48" />}
                </div>
                <div className="rounded-3xl border bg-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold text-xl">Para onde foi o dinheiro</h2>
                        <Link
                            to="/transactions"
                            search={{ month, type: "expense" }}
                            className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                        >
                            ver despesas
                            <ArrowRightIcon className="size-3" />
                        </Link>
                    </div>
                    {summary ? <CategoryBreakdown byCategory={summary.byCategory} /> : <Skeleton className="h-48" />}
                </div>
            </section>
        </>
    )
}

const formatShort = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100)

function StatTile({ label, cents, hint }: { label: string; cents?: number; hint?: string }) {
    return (
        <div className="bg-card p-5">
            <p className="text-muted-foreground text-sm">{label}</p>
            {cents === undefined ? (
                <Skeleton className="mt-1 h-8 w-28" />
            ) : (
                <AnimatedMoney cents={cents} variant="hero" className="text-2xl" />
            )}
            {hint ? <p className="mt-1 text-muted-foreground text-xs">{hint}</p> : null}
        </div>
    )
}

// Primeiro acesso: sem conta não há o que mostrar no painel, então o próximo passo vira o conteúdo.
function Onboarding({ name }: { name?: string }) {
    const steps = [
        { title: "Cadastre a conta onde seu dinheiro fica", to: "/accounts" as const },
        { title: "Adicione seu cartão com fechamento e vencimento", to: "/credit-cards" as const },
        { title: "Registre aluguel, internet e assinaturas como recorrências", to: "/recurring" as const },
    ]
    return (
        <section className="mx-auto max-w-xl space-y-8 py-10">
            <div className="space-y-2">
                <p className="text-muted-foreground">Bem-vindo{name ? `, ${name}` : ""}.</p>
                <h1 className="font-semibold text-4xl">Três passos e o mês se organiza sozinho.</h1>
            </div>
            <ol className="space-y-3">
                {steps.map((step, index) => (
                    <motion.li
                        key={step.to}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.1 }}
                    >
                        <Link
                            to={step.to}
                            className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50"
                        >
                            <span className="money grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                                {index + 1}
                            </span>
                            <span className="flex-1 font-medium">{step.title}</span>
                            <ArrowRightIcon className="size-4 text-muted-foreground" />
                        </Link>
                    </motion.li>
                ))}
            </ol>
            <Button nativeButton={false} render={<Link to="/accounts" />} size="lg">
                <PlusIcon />
                Começar pela conta
            </Button>
        </section>
    )
}
