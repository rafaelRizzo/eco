// Select de opções {value, label} sobre o Select do shadcn (Base UI), sempre passando `items`
// pra o trigger fechado mostrar o label e não o valor cru (id/enum). Aceita opção vazia (null).
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type Option = { value: string; label: string; color?: string | null }

type Props = {
    options: Option[]
    value: string | null
    onChange: (value: string | null) => void
    placeholder?: string
    // Rótulo da opção "nenhum" (ex: "Sem categoria"); sem ele o campo é obrigatório.
    emptyLabel?: string
    id?: string
    invalid?: boolean
    disabled?: boolean
}

const EMPTY = "__empty__"

export function OptionSelect({ options, value, onChange, placeholder, emptyLabel, id, invalid, disabled }: Props) {
    const items: Record<string, React.ReactNode> = Object.fromEntries(options.map((option) => [option.value, option.label]))
    if (emptyLabel) items[EMPTY] = emptyLabel
    const hasColors = options.some((option) => option.color)

    return (
        <Select
            items={items}
            value={value ?? (emptyLabel ? EMPTY : null)}
            onValueChange={(next) => onChange(next === EMPTY || next == null ? null : String(next))}
            disabled={disabled}
        >
            <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
                <SelectValue placeholder={placeholder ?? "Selecione"} />
            </SelectTrigger>
            {/* Abre logo abaixo do campo (sem sobrepor o trigger), com respiro entre a borda e os itens. */}
            <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                    {emptyLabel ? (
                        <SelectItem value={EMPTY}>
                            {/* Círculo vazado = "sem cor", mantendo o texto alinhado com as opções que têm bolinha. */}
                            {hasColors ? <span className="size-2.5 shrink-0 rounded-full border border-muted-foreground/60" /> : null}
                            {emptyLabel}
                        </SelectItem>
                    ) : null}
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.color ? (
                                <span className="swatch size-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                            ) : hasColors ? (
                                <span className="size-2.5 shrink-0" />
                            ) : null}
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
