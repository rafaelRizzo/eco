// Campo de data (shadcn Calendar em Popover) com cara de input; trafega "YYYY-MM-DD" ("" = vazio), igual ao input nativo.
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { capitalizeFirst, formatDate, todayKey } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
    value: string
    onChange: (value: string) => void
    id?: string
    invalid?: boolean
    placeholder?: string
    // Campo opcional: mostra "Limpar" (volta pra "").
    clearable?: boolean
}

export function DatePicker({ value, onChange, id, invalid, placeholder = "Selecione a data", clearable }: Props) {
    const [open, setOpen] = useState(false)
    const selected = value ? parseISO(value) : undefined

    const pick = (next: string) => {
        onChange(next)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                id={id}
                aria-invalid={invalid || undefined}
                className={cn(
                    "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50",
                    !value && "text-muted-foreground",
                )}
            >
                {value ? formatDate(value) : placeholder}
                <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto gap-0 p-0">
                <Calendar
                    mode="single"
                    locale={ptBR}
                    selected={selected}
                    defaultMonth={selected}
                    onSelect={(date) => date && pick(format(date, "yyyy-MM-dd"))}
                    formatters={{ formatCaption: (month) => capitalizeFirst(format(month, "MMMM 'de' yyyy", { locale: ptBR })) }}
                    className="p-3"
                />
                <div className="flex items-center justify-between gap-2 border-t p-2">
                    {clearable && value ? (
                        <Button variant="ghost" size="sm" onClick={() => pick("")}>
                            Limpar
                        </Button>
                    ) : (
                        <span />
                    )}
                    <Button variant="ghost" size="sm" onClick={() => pick(todayKey())}>
                        Hoje
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
