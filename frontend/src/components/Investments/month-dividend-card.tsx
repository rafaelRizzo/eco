// Card de um mês na aba Proventos: total em destaque, barra proporcional (recebido / a receber / estimado) e legenda.
import { AnimatedMoney } from "@/components/animated-money"
import { Badge } from "@/components/ui/badge"
import type { MonthTotals } from "@/hooks/use-dividends"
import { formatCents } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
    label: string
    totals: MonthTotals
    selected: boolean
    onSelect: () => void
}

// Só neutral + emerald: recebido = esmeralda cheio, a receber = esmeralda claro, estimado = neutro.
const SEGMENTS = [
    { key: "receivedCents", label: "Recebido", bar: "bg-chart-income", dot: "bg-chart-income" },
    { key: "pendingCents", label: "A receber", bar: "bg-chart-income/40", dot: "bg-chart-income/40" },
    { key: "estimatedCents", label: "Estimado", bar: "bg-muted-foreground/30", dot: "border border-muted-foreground/60" },
] as const

export function MonthDividendCard({ label, totals, selected, onSelect }: Props) {
    const parts = SEGMENTS.filter((segment) => totals[segment.key] > 0)

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/50",
                selected && "border-income/50 ring-1 ring-income/30",
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-muted-foreground text-xs">{label}</p>
                {totals.dueCount > 0 ? (
                    <Badge className="h-5 bg-foreground px-2 font-normal text-background">
                        {totals.dueCount} p/ confirmar
                    </Badge>
                ) : null}
            </div>

            <AnimatedMoney cents={totals.totalCents} className="text-xl sm:text-2xl" />

            {totals.totalCents > 0 ? (
                <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                    {parts.map((segment) => (
                        <span
                            key={segment.key}
                            className={cn("h-full rounded-full", segment.bar)}
                            style={{ width: `${(totals[segment.key] / totals.totalCents) * 100}%` }}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-xs">Nenhum provento previsto</p>
            )}

            {parts.length > 0 ? (
                <ul className="space-y-1">
                    {parts.map((segment) => (
                        <li key={segment.key} className="flex items-center gap-2 text-xs">
                            <span className={cn("size-2 shrink-0 rounded-full", segment.dot)} />
                            <span className="flex-1 text-muted-foreground">{segment.label}</span>
                            <span className="money">{formatCents(totals[segment.key])}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
        </button>
    )
}
