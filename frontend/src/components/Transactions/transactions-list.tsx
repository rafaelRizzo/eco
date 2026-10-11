// Extrato agrupado por dia: cada linha mostra categoria, origem (conta/cartão), status e valor colorido.
import { CheckIcon, CreditCardIcon, EllipsisIcon, LandmarkIcon, PencilIcon, RepeatIcon, Trash2Icon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useMemo } from "react"
import { Money } from "@/components/money"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Account } from "@/hooks/use-accounts"
import type { Category } from "@/hooks/use-categories"
import type { CreditCard } from "@/hooks/use-credit-cards"
import type { Transaction } from "@/hooks/use-transactions"
import { capitalizeFirst, formatDate, todayKey } from "@/lib/format"
import { TransactionStatusBadge } from "./transaction-status-badge"

type Props = {
    transactions: Transaction[]
    categories: Map<string, Category>
    accounts: Account[]
    creditCards: CreditCard[]
    onEdit: (transaction: Transaction) => void
    onDelete: (transaction: Transaction) => void
    onPay: (transaction: Transaction) => void
}

const dayLabel = (date: string) => {
    if (date === todayKey()) return "Hoje"
    return capitalizeFirst(formatDate(date, "EEEE, dd 'de' MMMM"))
}

export function TransactionsList({ transactions, categories, accounts, creditCards, onEdit, onDelete, onPay }: Props) {
    const groups = useMemo(() => {
        const byDate = new Map<string, Transaction[]>()
        for (const transaction of transactions) {
            const list = byDate.get(transaction.date) ?? []
            list.push(transaction)
            byDate.set(transaction.date, list)
        }
        return [...byDate.entries()]
    }, [transactions])

    const accountName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts])
    const cardName = useMemo(() => new Map(creditCards.map((c) => [c.id, c.name])), [creditCards])

    return (
        <div className="space-y-6">
            {groups.map(([date, items]) => {
                const dayTotal = items.reduce((sum, t) => sum + (t.type === "income" ? t.amountCents : -t.amountCents), 0)
                return (
                    <section key={date} aria-label={dayLabel(date)}>
                        <div className="mb-2 flex items-baseline justify-between px-1">
                            <h3 className="font-heading font-medium text-muted-foreground text-sm">{dayLabel(date)}</h3>
                            <Money cents={dayTotal} tone="signed" className="text-muted-foreground text-xs" />
                        </div>
                        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                            <AnimatePresence initial={false}>
                                {items.map((transaction) => {
                                    const category = transaction.categoryId ? categories.get(transaction.categoryId) : undefined
                                    const origin = transaction.creditCardId
                                        ? { icon: CreditCardIcon, name: cardName.get(transaction.creditCardId) }
                                        : { icon: LandmarkIcon, name: accountName.get(transaction.accountId ?? "") }
                                    const OriginIcon = origin.icon
                                    const canPay = !transaction.creditCardId && transaction.status !== "paid"

                                    return (
                                        <motion.li
                                            key={transaction.id}
                                            layout="position"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, x: -16 }}
                                            className="flex items-center gap-3 px-4 py-3"
                                        >
                                            <span
                                                className="swatch size-2.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: category?.color ?? "var(--border)" }}
                                                title={category?.name ?? "Sem categoria"}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1.5 truncate font-medium text-sm">
                                                    {transaction.description}
                                                    {transaction.installmentTotal ? (
                                                        <span className="money shrink-0 text-muted-foreground text-xs">
                                                            {transaction.installmentNumber}/{transaction.installmentTotal}
                                                        </span>
                                                    ) : null}
                                                    {transaction.recurringTransactionId ? (
                                                        <RepeatIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Recorrente" />
                                                    ) : null}
                                                </p>
                                                <p className="flex items-center gap-1.5 truncate text-muted-foreground text-xs">
                                                    <OriginIcon className="size-3.5 shrink-0" />
                                                    {origin.name ?? "-"}
                                                    <span aria-hidden>·</span>
                                                    {category?.name ?? "Sem categoria"}
                                                </p>
                                            </div>
                                            <div className="hidden sm:block">
                                                <TransactionStatusBadge status={transaction.status} />
                                            </div>
                                            <Money
                                                cents={transaction.amountCents}
                                                tone={transaction.type === "income" ? "income" : "expense"}
                                                className="text-sm"
                                            />
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={<Button variant="ghost" size="icon-sm" aria-label="Ações do lançamento" />}
                                                >
                                                    <EllipsisIcon />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {canPay ? (
                                                        <DropdownMenuItem onClick={() => onPay(transaction)}>
                                                            <CheckIcon />
                                                            {transaction.type === "income" ? "Marcar como recebido" : "Marcar como pago"}
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                                                        <PencilIcon />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(transaction)}>
                                                        <Trash2Icon />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </motion.li>
                                    )
                                })}
                            </AnimatePresence>
                        </ul>
                    </section>
                )
            })}
        </div>
    )
}
