// Barra de limite do cartão: esmeralda enquanto há folga; acima de 70% vira neutro médio e acima de 90%
// neutro escuro + aviso escrito (estado nunca só pela cor).
import { motion } from "motion/react"
import { Money } from "@/components/money"
import { cn } from "@/lib/utils"

type Props = { usedCents: number; limitCents: number; className?: string }

export function LimitBar({ usedCents, limitCents, className }: Props) {
    const ratio = limitCents > 0 ? Math.min(Math.max(usedCents / limitCents, 0), 1) : 0
    const tone = ratio > 0.9 ? "bg-foreground" : ratio > 0.7 ? "bg-muted-foreground" : "bg-primary"

    return (
        <div className={cn("space-y-2", className)}>
            <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ratio * 100)}
                aria-label="Limite usado"
            >
                <motion.div
                    className={cn("h-full origin-left rounded-full", tone)}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: ratio }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>
            <div className="flex justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                    Usado <Money cents={usedCents} className="text-foreground" />
                    {ratio > 0.9 ? <span className="ml-1.5 font-medium text-foreground">· quase no limite</span> : null}
                </span>
                <span className="text-muted-foreground">
                    Livre <Money cents={limitCents - usedCents} className="text-foreground" />
                </span>
            </div>
        </div>
    )
}
