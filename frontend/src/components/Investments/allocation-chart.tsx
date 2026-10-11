// Alocação da carteira por classe: barras horizontais de um tom só (magnitude), rótulo e percentual ao lado.
import { motion } from "motion/react"
import { Money } from "@/components/money"
import { assetClassLabels, type PortfolioSummary } from "@/hooks/use-assets"

type Props = { byClass: PortfolioSummary["byClass"] }

export function AllocationChart({ byClass }: Props) {
    if (byClass.length === 0) {
        return <p className="py-6 text-center text-muted-foreground text-sm">Sem posições para mostrar a alocação.</p>
    }

    const max = Math.max(1, ...byClass.map((row) => row.valueCents))

    return (
        <ul className="space-y-4">
            {byClass.map((row, index) => (
                <li key={row.class} className="space-y-1.5">
                    <div className="flex items-baseline gap-2 text-sm">
                        <span className="flex-1 truncate">{assetClassLabels[row.class]}</span>
                        <Money cents={row.valueCents} className="text-sm" />
                        <span className="money w-12 text-right text-muted-foreground text-xs">
                            {row.percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                        </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        {/* width (não scaleX): escalar achata o arredondamento e cria um degrau na ponta. */}
                        <motion.div
                            className="h-full min-w-2 rounded-full bg-chart-income"
                            initial={{ width: 0 }}
                            animate={{ width: `${(row.valueCents / max) * 100}%` }}
                            transition={{ delay: 0.15 + index * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    )
}
