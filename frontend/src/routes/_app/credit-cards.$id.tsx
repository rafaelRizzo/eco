// Detalhe do cartão: linha do tempo de faturas (por mês de vencimento), compras da fatura escolhida e pagamento.
import { createFileRoute } from "@tanstack/react-router"
import { ReceiptIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useMemo, useState } from "react"
import { InvoiceStatusBadge } from "@/components/CreditCards/invoice-status-badge"
import { LimitBar } from "@/components/CreditCards/limit-bar"
import { PayInvoiceDialog } from "@/components/CreditCards/pay-invoice-dialog"
import { AnimatedMoney } from "@/components/animated-money"
import { Money } from "@/components/money"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategories } from "@/hooks/use-categories"
import { useCreditCard } from "@/hooks/use-credit-cards"
import { type Invoice, useInvoice, useInvoices } from "@/hooks/use-invoices"
import { capitalizeFirst, formatDate, formatMonth } from "@/lib/format"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app/credit-cards/$id")({
    staticData: { crumb: CreditCardCrumb },
    component: CreditCardDetailPage,
})

// Crumb do breadcrumb: nome do cartão (mesma query da página, então vem do cache).
function CreditCardCrumb({ params }: { params: Record<string, string> }) {
    const { creditCard } = useCreditCard(params.id ?? "")
    return creditCard?.name ?? "Cartão"
}

// Fatura mais relevante: a próxima a vencer ainda não paga; senão a mais recente.
const pickDefault = (invoices: Invoice[]) => {
    const unpaid = invoices.filter((i) => i.status !== "paid").sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return unpaid[0]?.id ?? invoices[0]?.id ?? null
}

function CreditCardDetailPage() {
    const { id } = Route.useParams()
    const { creditCard, loading: cardLoading } = useCreditCard(id)
    const { invoices, loading: invoicesLoading, payInvoice } = useInvoices(id)
    const { byId: categories } = useCategories()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [paying, setPaying] = useState<Invoice | null>(null)

    const timeline = useMemo(() => [...invoices].sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth)), [invoices])
    const activeId = selectedId ?? pickDefault(invoices)
    const { invoice, loading: invoiceLoading } = useInvoice(activeId)

    if (cardLoading) return <Skeleton className="h-64 rounded-2xl" />
    if (!creditCard) return <p className="text-muted-foreground">Cartão não encontrado.</p>

    return (
        <>
            <PageHeader
                title={creditCard.name}
                description={`Fecha dia ${creditCard.closingDay} · vence dia ${creditCard.dueDay}`}
            />

            <LimitBar usedCents={creditCard.usedLimitCents} limitCents={creditCard.limitCents} className="max-w-xl" />

            {invoicesLoading ? (
                <Skeleton className="h-20 rounded-2xl" />
            ) : timeline.length === 0 ? (
                <Empty className="border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ReceiptIcon />
                        </EmptyMedia>
                        <EmptyTitle>Nenhuma fatura ainda</EmptyTitle>
                        <EmptyDescription>
                            A fatura aparece aqui assim que você lançar a primeira compra neste cartão.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    <nav aria-label="Faturas" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                        {timeline.map((item) => {
                            const active = item.id === activeId
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedId(item.id)}
                                    aria-current={active || undefined}
                                    className={cn(
                                        "relative flex min-w-28 shrink-0 flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left transition-colors",
                                        active ? "border-transparent text-primary-foreground" : "bg-card hover:bg-muted",
                                    )}
                                >
                                    {active ? (
                                        <motion.span
                                            layoutId="invoice-active"
                                            className="absolute inset-0 rounded-xl bg-primary"
                                            transition={{ type: "spring", stiffness: 450, damping: 38 }}
                                        />
                                    ) : null}
                                    <span className="relative font-heading font-medium text-sm">
                                        {capitalizeFirst(formatMonth(item.referenceMonth, "MMM yy"))}
                                    </span>
                                    <Money cents={item.totalCents} className="relative text-xs" />
                                </button>
                            )
                        })}
                    </nav>

                    <AnimatePresence mode="wait">
                        {invoiceLoading || !invoice ? (
                            <Skeleton key="loading" className="h-72 rounded-2xl" />
                        ) : (
                            <motion.section
                                key={invoice.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden rounded-2xl border bg-card"
                            >
                                <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-semibold text-xl">
                                                Fatura de {formatMonth(invoice.referenceMonth, "MMMM")}
                                            </h2>
                                            <InvoiceStatusBadge status={invoice.status} />
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            Fecha {formatDate(invoice.closingDate)} · vence{" "}
                                            <span className="font-medium text-foreground">{formatDate(invoice.dueDate)}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-end gap-4">
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-xs">Total</p>
                                            <AnimatedMoney cents={invoice.totalCents} className="text-3xl" />
                                        </div>
                                        {invoice.status !== "paid" && invoice.totalCents > 0 ? (
                                            <Button onClick={() => setPaying(invoice)}>Pagar fatura</Button>
                                        ) : null}
                                    </div>
                                </div>
                                {invoice.transactions.length === 0 ? (
                                    <p className="p-5 text-muted-foreground text-sm">Nenhuma compra nesta fatura.</p>
                                ) : (
                                    <ul className="divide-y">
                                        {invoice.transactions.map((transaction) => {
                                            const category = transaction.categoryId
                                                ? categories.get(transaction.categoryId)
                                                : undefined
                                            return (
                                                <li key={transaction.id} className="flex items-center gap-3 px-5 py-3">
                                                    <span className="money w-12 shrink-0 text-muted-foreground text-xs">
                                                        {formatDate(transaction.date, "dd/MM")}
                                                    </span>
                                                    <span
                                                        className="swatch size-2.5 shrink-0 rounded-full"
                                                        style={{ backgroundColor: category?.color ?? "var(--border)" }}
                                                    />
                                                    <span className="min-w-0 flex-1 truncate text-sm">
                                                        {transaction.description}
                                                        {transaction.installmentTotal ? (
                                                            <span className="money ml-1.5 text-muted-foreground text-xs">
                                                                {transaction.installmentNumber}/{transaction.installmentTotal}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                    <Money
                                                        cents={transaction.amountCents}
                                                        tone={transaction.type === "income" ? "income" : "neutral"}
                                                        className="text-sm"
                                                    />
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </motion.section>
                        )}
                    </AnimatePresence>
                </>
            )}

            <PayInvoiceDialog
                invoice={paying}
                defaultAccountId={creditCard.paymentAccountId}
                onOpenChange={(open) => !open && setPaying(null)}
                onConfirm={(item, accountId) => payInvoice(item.id, accountId)}
            />
        </>
    )
}
