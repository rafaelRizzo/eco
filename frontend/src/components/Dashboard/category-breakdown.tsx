// Gasto do mês por categoria: barras de um tom só, proporcionais ao total gasto (a barra e o % contam a mesma história).
// Até 6 categorias; o resto vira "Demais categorias" (nunca uma cor gerada a mais), com marcador vazado.
import { motion } from "motion/react"
import { Money } from "@/components/money"
import type { MonthlySummary } from "@/hooks/use-reports"

type Props = { byCategory: MonthlySummary["byCategory"] }

const MAX_ROWS = 6
const OTHERS_ID = "__others"

const formatShare = (cents: number, total: number) => {
    const share = (cents / total) * 100
    return share > 0 && share < 1 ? "<1%" : `${Math.round(share)}%`
}

export function CategoryBreakdown({ byCategory }: Props) {
    const expenses = byCategory.filter((row) => row.type === "expense").sort((a, b) => b.totalCents - a.totalCents)
    const head = expenses.slice(0, MAX_ROWS)
    const rest = expenses.slice(MAX_ROWS)
    const rows = rest.length
        ? [
              ...head,
              {
                  categoryId: OTHERS_ID,
                  name: `Demais categorias (${rest.length})`,
                  color: null,
                  type: "expense" as const,
                  totalCents: rest.reduce((sum, row) => sum + row.totalCents, 0),
              },
          ]
        : head
    const total = Math.max(
        1,
        expenses.reduce((sum, row) => sum + row.totalCents, 0),
    )

    if (rows.length === 0) {
        return <p className="py-8 text-center text-muted-foreground text-sm">Nenhuma despesa lançada neste mês.</p>
    }

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between border-b pb-3">
                <span className="text-muted-foreground text-sm">Total gasto no mês</span>
                <Money cents={total} className="font-semibold text-base" />
            </div>
            <ul className="space-y-4">
                {rows.map((row, index) => (
                    <li key={row.categoryId ?? "none"} className="space-y-1.5">
                        <div className="flex items-baseline gap-2 text-sm">
                            {row.categoryId === OTHERS_ID ? (
                                <span className="size-2.5 shrink-0 self-center rounded-full border border-muted-foreground" />
                            ) : (
                                <span
                                    className="swatch size-2.5 shrink-0 self-center rounded-full"
                                    style={{ backgroundColor: row.color ?? "var(--muted-foreground)" }}
                                />
                            )}
                            <span className="flex-1 truncate">{row.name}</span>
                            <Money cents={row.totalCents} className="text-sm" />
                            <span className="money w-10 text-right text-muted-foreground text-xs">
                                {formatShare(row.totalCents, total)}
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            {/* width (não scaleX): escalar achata o arredondamento e cria um degrau na ponta esquerda. */}
                            <motion.div
                                className="h-full min-w-2 rounded-full bg-chart-expense"
                                initial={{ width: 0 }}
                                animate={{ width: `${(row.totalCents / total) * 100}%` }}
                                transition={{ delay: 0.15 + index * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
