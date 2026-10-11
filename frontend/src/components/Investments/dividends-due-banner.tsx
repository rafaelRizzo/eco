// Aviso de proventos estimados que já passaram da data e aguardam confirmação (valor real + conta que recebeu).
import { CoinsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCents } from "@/lib/format"

type Props = { count: number; cents: number; onOpen: () => void }

export function DividendsDueBanner({ count, cents, onOpen }: Props) {
    if (count === 0) return null

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-income/30 bg-income/5 p-4 sm:flex-row sm:items-center">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-income/10 text-income">
                <CoinsIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">
                    {count === 1 ? "1 provento aguardando confirmação" : `${count} proventos aguardando confirmação`}
                </p>
                <p className="text-muted-foreground text-xs">
                    {formatCents(cents)} estimados já passaram da data. Confirme o valor real e a conta pra entrar no saldo.
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpen}>
                Confirmar
            </Button>
        </div>
    )
}
