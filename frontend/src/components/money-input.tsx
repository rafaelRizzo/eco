// Campo de dinheiro estilo maquininha: o usuário digita só números e o valor cresce pelos centavos (1 -> 0,01 -> 0,19 -> 1,99).
import { Input } from "@/components/ui/input"
import { formatCents } from "@/lib/format"

type Props = {
    value: number
    onChange: (cents: number) => void
    allowNegative?: boolean
    id?: string
    invalid?: boolean
    autoFocus?: boolean
}

const MAX_CENTS = 99_999_999_99

export function MoneyInput({ value, onChange, allowNegative = false, id, invalid, autoFocus }: Props) {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value
        const negative = allowNegative && raw.includes("-")
        const digits = raw.replace(/\D/g, "")
        const cents = Math.min(Number(digits || "0"), MAX_CENTS)
        onChange(negative ? -cents : cents)
    }

    return (
        <Input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            autoFocus={autoFocus}
            aria-invalid={invalid || undefined}
            className="money text-right"
            value={formatCents(value)}
            onChange={handleChange}
            // Cursor sempre no fim: digitar empurra os centavos, como numa calculadora.
            onFocus={(event) => {
                const input = event.currentTarget
                requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length))
            }}
        />
    )
}
