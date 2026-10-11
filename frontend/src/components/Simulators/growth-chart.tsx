// Evolução do patrimônio por ano: coluna empilhada com o que foi investido (neutro) e o rendimento acumulado (esmeralda).
import { motion } from "motion/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCents } from "@/lib/format"
import type { YearRow } from "@/lib/compound-interest"

type Props = { rows: YearRow[] }

export function GrowthChart({ rows }: Props) {
    const max = Math.max(1, ...rows.map((row) => row.balanceCents))
    // Rótulo do eixo só em alguns anos pra não amontoar em horizontes longos.
    const labelEvery = rows.length > 30 ? 5 : rows.length > 15 ? 2 : 1

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4 text-muted-foreground text-xs">
                <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-chart-expense" />
                    Investido
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-chart-income" />
                    Rendimento
                </span>
            </div>
            <div className="flex h-56 items-end gap-1 border-b">
                {rows.map((row, index) => {
                    const total = (row.balanceCents / max) * 100
                    const investedShare = row.balanceCents > 0 ? Math.min(row.investedCents / row.balanceCents, 1) : 0
                    const gain = Math.max(row.balanceCents - row.investedCents, 0)
                    return (
                        <Tooltip key={row.year}>
                            <TooltipTrigger
                                render={
                                    <button
                                        type="button"
                                        aria-label={`Ano ${row.year}: patrimônio ${formatCents(row.balanceCents)}`}
                                        className="flex h-full min-w-0 flex-1 items-end rounded-sm outline-none hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                }
                            >
                                <motion.div
                                    className="flex w-full origin-bottom flex-col justify-end overflow-hidden rounded-t-[3px]"
                                    style={{ height: `${total}%` }}
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    transition={{ delay: Math.min(index * 0.02, 0.5), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <div className="w-full bg-chart-income" style={{ flexGrow: 1 - investedShare }} />
                                    <div className="w-full bg-chart-expense" style={{ flexGrow: investedShare }} />
                                </motion.div>
                            </TooltipTrigger>
                            <TooltipContent className="flex-col items-start gap-1 px-3 py-2">
                                <span className="font-medium">Ano {row.year}</span>
                                <span className="money">Patrimônio {formatCents(row.balanceCents)}</span>
                                <span className="money">Investido {formatCents(row.investedCents)}</span>
                                <span className="money">Rendimento {formatCents(gain)}</span>
                            </TooltipContent>
                        </Tooltip>
                    )
                })}
            </div>
            <div className="flex gap-1 text-muted-foreground text-xs">
                {rows.map((row) => (
                    <span key={row.year} className="money min-w-0 flex-1 text-center">
                        {row.year % labelEvery === 0 || row.year === 1 ? row.year : ""}
                    </span>
                ))}
            </div>
        </div>
    )
}
