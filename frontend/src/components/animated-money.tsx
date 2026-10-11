// Valor em BRL que "conta" até o número novo quando muda (troca de mês, pagamento...). Respeita reduced motion.
// variant "hero": número de destaque em sans proporcional (dígitos tabulares só em colunas alinhadas).
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react"
import { useEffect } from "react"
import { formatCents } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = { cents: number; className?: string; variant?: "inline" | "hero" }

export function AnimatedMoney({ cents, className, variant = "inline" }: Props) {
    const reduceMotion = useReducedMotion()
    const value = useMotionValue(reduceMotion ? cents : 0)
    const text = useTransform(value, (latest) => formatCents(Math.round(latest)))

    useEffect(() => {
        if (reduceMotion) {
            value.set(cents)
            return
        }
        const controls = animate(value, cents, { duration: 0.9, ease: [0.16, 1, 0.3, 1] })
        return () => controls.stop()
    }, [cents, reduceMotion, value])

    return (
        <motion.span
            className={cn(
                "whitespace-nowrap",
                variant === "hero" ? "font-sans font-semibold tracking-tight" : "money",
                className,
            )}
            aria-label={formatCents(cents)}
        >
            {text}
        </motion.span>
    )
}
