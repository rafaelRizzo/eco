// Página de lançamentos: extrato do mês com filtros (tipo, status, busca), totais e CRUD.
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeftRightIcon, PlusIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { z } from "zod"
import { AnimatedMoney } from "@/components/animated-money"
import { MonthPicker } from "@/components/month-picker"
import { OptionSelect } from "@/components/option-select"
import { PageHeader } from "@/components/page-header"
import { DeleteTransactionDialog } from "@/components/Transactions/delete-transaction-dialog"
import { TransactionFormDialog } from "@/components/Transactions/transaction-form-dialog"
import { TransactionsList } from "@/components/Transactions/transactions-list"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useCreditCards } from "@/hooks/use-credit-cards"
import { type Transaction, transactionStatusLabels, useTransactions } from "@/hooks/use-transactions"
import { capitalizeFirst, currentMonthKey, formatMonth } from "@/lib/format"

const searchSchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional()
        .catch(undefined),
    type: z.enum(["income", "expense"]).optional().catch(undefined),
    status: z.enum(["pending", "paid", "overdue"]).optional().catch(undefined),
})

export const Route = createFileRoute("/_app/transactions")({
    staticData: { crumb: "Lançamentos" },
    validateSearch: searchSchema,
    component: TransactionsPage,
})

const statusOptions = Object.entries(transactionStatusLabels).map(([value, label]) => ({ value, label }))

function TransactionsPage() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    const month = search.month ?? currentMonthKey()

    const { byId: categories } = useCategories()
    const { accounts } = useAccounts()
    const { creditCards } = useCreditCards()
    const {
        transactions,
        totals,
        loading,
        search: term,
        setSearch,
        createTransaction,
        updateTransaction,
        payTransaction,
        deleteTransaction,
    } = useTransactions({ month, type: search.type, status: search.status })

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Transaction | null>(null)
    const [deleting, setDeleting] = useState<Transaction | null>(null)

    const setSearchParam = (patch: Partial<z.infer<typeof searchSchema>>) =>
        navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true })

    const openCreate = () => {
        setEditing(null)
        setFormOpen(true)
    }

    return (
        <>
            <PageHeader
                title="Lançamentos"
                description={capitalizeFirst(formatMonth(month))}
                actions={
                    <>
                        <MonthPicker month={month} onChange={(next) => setSearchParam({ month: next })} />
                        <Button onClick={openCreate} disabled={accounts.length === 0 && creditCards.length === 0}>
                            <PlusIcon />
                            Novo lançamento
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-border">
                <div className="bg-card p-4">
                    <p className="text-muted-foreground text-xs">Entradas</p>
                    <AnimatedMoney cents={totals.incomeCents} className="text-income text-lg sm:text-xl" />
                </div>
                <div className="bg-card p-4">
                    <p className="text-muted-foreground text-xs">Saídas</p>
                    <AnimatedMoney cents={totals.expenseCents} className="text-expense text-lg sm:text-xl" />
                </div>
                <div className="bg-card p-4">
                    <p className="text-muted-foreground text-xs">Resultado</p>
                    <AnimatedMoney cents={totals.incomeCents - totals.expenseCents} className="text-lg sm:text-xl" />
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Tabs
                    value={search.type ?? "all"}
                    onValueChange={(value) => setSearchParam({ type: value === "all" ? undefined : (value as "income" | "expense") })}
                >
                    <TabsList>
                        <TabsTrigger value="all">Tudo</TabsTrigger>
                        <TabsTrigger value="expense">Despesas</TabsTrigger>
                        <TabsTrigger value="income">Receitas</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="sm:w-44">
                    <OptionSelect
                        options={statusOptions}
                        value={search.status ?? null}
                        onChange={(value) => setSearchParam({ status: (value ?? undefined) as typeof search.status })}
                        emptyLabel="Qualquer status"
                    />
                </div>
                <div className="relative sm:ml-auto sm:w-64">
                    <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={term}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar descrição"
                        aria-label="Buscar descrição"
                        className="pl-8"
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2, 3].map((key) => (
                        <Skeleton key={key} className="h-16 rounded-2xl" />
                    ))}
                </div>
            ) : transactions.length === 0 ? (
                <Empty className="border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ArrowLeftRightIcon />
                        </EmptyMedia>
                        <EmptyTitle>Nada lançado {term || search.type || search.status ? "com esses filtros" : "neste mês"}</EmptyTitle>
                        <EmptyDescription>
                            {accounts.length === 0
                                ? "Cadastre uma conta em Contas pra começar a lançar."
                                : "Registre gastos, compras no cartão e entradas pra ver o mês tomar forma."}
                        </EmptyDescription>
                    </EmptyHeader>
                    {accounts.length || creditCards.length ? (
                        <EmptyContent>
                            <Button onClick={openCreate}>
                                <PlusIcon />
                                Novo lançamento
                            </Button>
                        </EmptyContent>
                    ) : null}
                </Empty>
            ) : (
                <TransactionsList
                    transactions={transactions}
                    categories={categories}
                    accounts={accounts}
                    creditCards={creditCards}
                    onEdit={(transaction) => {
                        setEditing(transaction)
                        setFormOpen(true)
                    }}
                    onDelete={setDeleting}
                    onPay={(transaction) => payTransaction(transaction.id)}
                />
            )}

            {editing ? (
                <TransactionFormDialog
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    transaction={editing}
                    onUpdate={(form) => updateTransaction(editing.id, form)}
                />
            ) : (
                <TransactionFormDialog
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    transaction={null}
                    onCreate={async (form) => !!(await createTransaction(form))}
                />
            )}

            <DeleteTransactionDialog
                transaction={deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                onConfirm={(transaction, all) => deleteTransaction(transaction.id, all)}
            />
        </>
    )
}
