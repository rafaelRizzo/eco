// Navegação entre meses (‹ outubro de 2026 ›): o rótulo desliza na direção da troca.
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { capitalizeFirst, currentMonthKey, formatMonth, shiftMonthKey } from "@/lib/format"

type Props = { month: string; onChange: (month: string) => void }

export function MonthPicker({ month, onChange }: Props) {
    const direction = useRef(0)
    const isCurrent = month === currentMonthKey()

    const go = (delta: number) => {
        direction.current = delta
        onChange(shiftMonthKey(month, delta))
    }

    return (
        // Mesma altura dos outros controles (h-8): botões de 24px dentro de borda + respiro de 3px, como as tabs.
        <div className="flex h-8 items-center gap-0.5 rounded-lg border bg-card p-[3px]">
            <Button variant="ghost" size="icon-xs" aria-label="Mês anterior" onClick={() => go(-1)}>
                <ChevronLeftIcon className="size-4" />
            </Button>
            {/* flex-1: quando o pai estica o seletor (header em coluna no mobile), as setas vão pras pontas e o mês fica centralizado. */}
            <div className="relative h-6 min-w-36 flex-1 overflow-hidden text-center">
                <AnimatePresence initial={false} custom={direction.current} mode="popLayout">
                    <motion.button
                        key={month}
                        type="button"
                        custom={direction.current}
                        initial={{ x: direction.current * 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction.current * -40, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        onClick={() => !isCurrent && onChange(currentMonthKey())}
                        title={isCurrent ? undefined : "Voltar pro mês atual"}
                        className="absolute inset-0 font-heading font-medium text-sm leading-6"
                    >
                        {capitalizeFirst(formatMonth(month))}
                    </motion.button>
                </AnimatePresence>
            </div>
            <Button variant="ghost" size="icon-xs" aria-label="Próximo mês" onClick={() => go(1)}>
                <ChevronRightIcon className="size-4" />
            </Button>
        </div>
    )
}
