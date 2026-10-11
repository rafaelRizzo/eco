// Valor monetário estático em BRL, com cor semântica opcional (receita/despesa/saldo).
import { formatCents } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
    cents: number
    // "signed": verde se positivo, vermelho se negativo; "income"/"expense": cor fixa com sinal.
    tone?: "neutral" | "signed" | "income" | "expense"
    className?: string
}

export function Money({ cents, tone = "neutral", className }: Props) {
    const color =
        tone === "income" || (tone === "signed" && cents > 0)
            ? "text-income"
            : tone === "expense" || (tone === "signed" && cents < 0)
              ? "text-expense"
              : undefined
    const prefix = tone === "income" ? "+ " : tone === "expense" ? "− " : ""

    return (
        <span className={cn("money whitespace-nowrap", color, className)}>
            {prefix}
            {formatCents(tone === "expense" ? Math.abs(cents) : cents)}
        </span>
    )
}
