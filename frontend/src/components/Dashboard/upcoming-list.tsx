// Próximos vencimentos (contas em conta + faturas), do mais urgente pro mais distante, com contagem de dias.
import { Link } from "@tanstack/react-router"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { AlarmClockIcon, CreditCardIcon, TriangleAlertIcon } from "lucide-react"
import { motion } from "motion/react"
import { Money } from "@/components/money"
import type { Upcoming } from "@/hooks/use-reports"
import { formatDate, todayKey } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = { upcoming: Upcoming; cardNames: Map<string, string> }

type Row = {
    key: string
    date: string
    title: string
    amountCents: number
    kind: "bill" | "invoice"
    link: { to: "/transactions"; search: { month: string } } | { to: "/credit-cards/$id"; params: { id: string } }
    income: boolean
}

const whenLabel = (date: string) => {
    const diff = differenceInCalendarDays(parseISO(date), parseISO(todayKey()))
    if (diff < 0) return { text: `atrasada há ${-diff} ${-diff === 1 ? "dia" : "dias"}`, tone: "overdue" as const }
    if (diff === 0) return { text: "vence hoje", tone: "soon" as const }
    if (diff === 1) return { text: "vence amanhã", tone: "soon" as const }
    return { text: `em ${diff} dias`, tone: diff <= 3 ? ("soon" as const) : ("later" as const) }
}

export function UpcomingList({ upcoming, cardNames }: Props) {
    const rows: Row[] = [
        ...upcoming.bills.map((bill) => ({
            key: bill.id,
            date: bill.date,
            title: bill.description,
            amountCents: bill.amountCents,
            kind: "bill" as const,
            income: bill.type === "income",
            link: { to: "/transactions" as const, search: { month: bill.date.slice(0, 7) } },
        })),
        ...upcoming.invoices.map((invoice) => ({
            key: invoice.id,
            date: invoice.dueDate,
            title: `Fatura ${cardNames.get(invoice.creditCardId) ?? ""}`.trim(),
            amountCents: invoice.totalCents,
            kind: "invoice" as const,
            income: false,
            link: { to: "/credit-cards/$id" as const, params: { id: invoice.creditCardId } },
        })),
    ].sort((a, b) => a.date.localeCompare(b.date))

    if (rows.length === 0) {
        return (
            <p className="py-8 text-center text-muted-foreground text-sm">
                Nada vencendo nos próximos dias. Respira.
            </p>
        )
    }

    return (
        <ul className="divide-y">
            {rows.slice(0, 8).map((row, index) => {
                const when = whenLabel(row.date)
                const Icon = when.tone === "overdue" ? TriangleAlertIcon : row.kind === "invoice" ? CreditCardIcon : AlarmClockIcon
                return (
                    <motion.li
                        key={row.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.04 }}
                    >
                        <Link
                            {...row.link}
                            className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-muted/50"
                        >
                            <Icon
                                className={cn(
                                    "size-4 shrink-0",
                                    when.tone === "overdue" ? "text-expense" : when.tone === "soon" ? "text-due" : "text-muted-foreground",
                                )}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium text-sm">{row.title}</span>
                                <span className="block text-muted-foreground text-xs">
                                    {formatDate(row.date, "dd/MM")} · {row.income ? when.text.replace("vence", "cai") : when.text}
                                </span>
                            </span>
                            <Money cents={row.amountCents} tone={row.income ? "income" : "neutral"} className="text-sm" />
                        </Link>
                    </motion.li>
                )
            })}
        </ul>
    )
}
