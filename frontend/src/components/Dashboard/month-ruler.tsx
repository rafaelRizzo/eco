// Régua do mês (elemento-assinatura do Eco): uma coluna por dia, saídas (contas e faturas) sobem do eixo
// em neutro, entradas descem em esmeralda. Tom cheio = já pago; tom claro = em aberto. Linha neutra = hoje.
// Paleta só neutral + emerald: contas e faturas viram uma série só (três séries não se distinguiriam com dois
// matizes); o tooltip diz o que é cada item.
// Mesma escala pros dois lados (um eixo só); hover/foco no dia mostra tudo que vence nele.
import { motion, useReducedMotion } from "motion/react"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Invoice } from "@/hooks/use-invoices"
import type { Transaction } from "@/hooks/use-transactions"
import { capitalizeFirst, formatCents, formatDate, todayKey } from "@/lib/format"
import { cn } from "@/lib/utils"

type Kind = "expense" | "income" | "invoice"

type Item = { id: string; kind: Kind; label: string; amountCents: number; settled: boolean; overdue: boolean }

type Props = {
    month: string
    transactions: Transaction[]
    invoices: Invoice[]
    cardNames: Map<string, string>
}

// Cada direção tem 80px; a maior soma diária do mês ocupa a altura toda.
const HALF_HEIGHT = 80

const FILL: Record<Kind, { solid: string; light: string }> = {
    expense: { solid: "bg-chart-expense", light: "bg-chart-expense/30" },
    invoice: { solid: "bg-chart-expense", light: "bg-chart-expense/30" },
    income: { solid: "bg-chart-income", light: "bg-chart-income/35" },
}

const STATUS_TEXT = (item: Item) =>
    item.settled ? (item.kind === "income" ? "recebido" : "pago") : item.overdue ? "atrasado" : "em aberto"

export function MonthRuler({ month, transactions, invoices, cardNames }: Props) {
    const reduceMotion = useReducedMotion()
    const today = todayKey()
    const [year, monthNumber] = month.split("-").map(Number) as [number, number]
    const daysInMonth = new Date(year, monthNumber, 0).getDate()

    const days = useMemo(() => {
        const buckets = Array.from({ length: daysInMonth }, (_, index) => ({
            date: `${month}-${String(index + 1).padStart(2, "0")}`,
            up: [] as Item[],
            down: [] as Item[],
        }))

        // Compras no cartão entram pela fatura (no vencimento), não uma a uma.
        for (const t of transactions) {
            if (t.creditCardId || !t.date.startsWith(month)) continue
            const bucket = buckets[Number(t.date.slice(8)) - 1]
            if (!bucket) continue
            const item: Item = {
                id: t.id,
                kind: t.type,
                label: t.description,
                amountCents: t.amountCents,
                settled: t.status === "paid",
                overdue: t.status === "overdue",
            }
            ;(t.type === "income" ? bucket.down : bucket.up).push(item)
        }
        for (const invoice of invoices) {
            if (!invoice.dueDate.startsWith(month) || invoice.totalCents <= 0) continue
            const bucket = buckets[Number(invoice.dueDate.slice(8)) - 1]
            bucket?.up.push({
                id: invoice.id,
                kind: "invoice",
                label: `Fatura ${cardNames.get(invoice.creditCardId) ?? "do cartão"}`,
                amountCents: invoice.totalCents,
                settled: invoice.status === "paid",
                overdue: invoice.status === "overdue",
            })
        }
        return buckets
    }, [transactions, invoices, cardNames, month, daysInMonth])

    const max = Math.max(
        1,
        ...days.map((day) => Math.max(sum(day.up), sum(day.down))),
    )
    const todayIndex = today.startsWith(month) ? Number(today.slice(8)) - 1 : -1
    const tickDays = [1, 5, 10, 15, 20, 25, daysInMonth]
    const hasData = days.some((day) => day.up.length || day.down.length)

    return (
        <figure className="space-y-4">
            {/* mb-8: espaço pro rótulo "hoje", que fica acima do topo da régua. */}
            <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
                <LegendKey className="bg-chart-expense" label="Saídas: contas e faturas (acima da linha)" />
                <LegendKey className="bg-chart-income" label="Entradas (abaixo da linha)" />
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-2 rounded-sm bg-muted-foreground/35" />
                    tom claro = em aberto
                </span>
            </div>

            <div className="relative" style={{ height: HALF_HEIGHT * 2 + 2 }}>
                {/* Eixo: desenha da esquerda pra direita na entrada. */}
                <motion.div
                    aria-hidden
                    className="absolute inset-x-0 h-px origin-left bg-ruler"
                    style={{ top: HALF_HEIGHT }}
                    initial={reduceMotion ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />

                {todayIndex >= 0 ? (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 z-10 flex -translate-x-1/2 flex-col items-center"
                        style={{ left: `${((todayIndex + 0.5) / daysInMonth) * 100}%` }}
                    >
                        <span className="-mt-5 rounded-full bg-foreground px-1.5 font-medium text-[0.65rem] text-background leading-4">
                            hoje
                        </span>
                        <span className="w-px flex-1 bg-foreground/50" />
                    </div>
                ) : null}

                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
                    {days.map((day, index) => {
                        const items = [...day.up, ...day.down]
                        const isPast = day.date < today
                        const ariaLabel = items.length
                            ? `${formatDate(day.date, "dd 'de' MMMM")}: ${items
                                  .map((item) => `${item.label} ${formatCents(item.amountCents)} ${STATUS_TEXT(item)}`)
                                  .join("; ")}`
                            : undefined

                        const column = (
                            <div className="relative h-full">
                                <Stack items={day.up} direction="up" max={max} delay={index * 0.018} reduceMotion={!!reduceMotion} />
                                <Stack items={day.down} direction="down" max={max} delay={index * 0.018} reduceMotion={!!reduceMotion} />
                            </div>
                        )

                        if (!items.length) return <div key={day.date} aria-hidden className={cn(isPast && "opacity-80")}>{column}</div>

                        return (
                            <Tooltip key={day.date}>
                                <TooltipTrigger
                                    render={
                                        <button
                                            type="button"
                                            aria-label={ariaLabel}
                                            className="rounded-sm outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    }
                                >
                                    {column}
                                </TooltipTrigger>
                                <TooltipContent className="flex-col items-start gap-1 px-3 py-2">
                                    <span className="font-medium">{capitalizeFirst(formatDate(day.date, "EEEE, dd/MM"))}</span>
                                    {items.map((item) => (
                                        <span key={item.id} className="flex w-full items-center gap-2">
                                            <span className={cn("size-2 shrink-0 rounded-full", FILL[item.kind].solid)} />
                                            <span className="flex-1 truncate">{item.label}</span>
                                            <span className="money">{formatCents(item.amountCents)}</span>
                                            <span className="opacity-70">{STATUS_TEXT(item)}</span>
                                        </span>
                                    ))}
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>

                {hasData ? null : (
                    <p className="absolute inset-x-0 top-[calc(50%+12px)] text-center text-muted-foreground text-sm">
                        Nenhuma conta, fatura ou receita com data neste mês.
                    </p>
                )}
            </div>

            <div className="relative h-4 text-muted-foreground text-xs" aria-hidden>
                {tickDays.map((day) => (
                    <span
                        key={day}
                        className="money absolute -translate-x-1/2"
                        style={{ left: `${((day - 0.5) / daysInMonth) * 100}%` }}
                    >
                        {day}
                    </span>
                ))}
            </div>
            <figcaption className="sr-only">
                Vencimentos e recebimentos por dia do mês. Use Tab para percorrer os dias com movimento.
            </figcaption>
        </figure>
    )
}

const sum = (items: Item[]) => items.reduce((total, item) => total + item.amountCents, 0)

function Stack({
    items,
    direction,
    max,
    delay,
    reduceMotion,
}: {
    items: Item[]
    direction: "up" | "down"
    max: number
    delay: number
    reduceMotion: boolean
}) {
    if (!items.length) return null
    const up = direction === "up"
    // Altura mínima de 4px pra conta pequena não sumir ao lado do salário.
    const height = Math.max(4, Math.round((sum(items) / max) * (HALF_HEIGHT - 4)))

    return (
        <motion.div
            className={cn(
                "absolute left-1/2 flex w-[min(70%,12px)] -translate-x-1/2 gap-[2px] overflow-hidden",
                // Ponta arredondada (4px) no lado do dado, reta no eixo.
                up ? "flex-col-reverse rounded-t-[4px]" : "flex-col rounded-b-[4px]",
            )}
            style={{
                height,
                ...(up ? { bottom: HALF_HEIGHT + 2 } : { top: HALF_HEIGHT + 1 }),
                originY: up ? 1 : 0,
            }}
            initial={reduceMotion ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.25 + delay, type: "spring", stiffness: 260, damping: 24 }}
        >
            {items.map((item) => (
                <span
                    key={item.id}
                    className={cn(
                        "w-full shrink-0",
                        item.settled ? FILL[item.kind].solid : FILL[item.kind].light,
                        item.overdue && "ring-1 ring-foreground ring-inset",
                    )}
                    style={{ flexGrow: item.amountCents, flexBasis: 0, minHeight: 2 }}
                />
            ))}
        </motion.div>
    )
}

function LegendKey({ className, label }: { className: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={cn("h-3 w-2 rounded-sm", className)} />
            {label}
        </span>
    )
}
