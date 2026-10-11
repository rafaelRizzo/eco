// Badge de status do lançamento (pago/pendente/atrasado) com a cor semântica certa.
import { Badge } from "@/components/ui/badge"
import { type TransactionStatus, transactionStatusLabels } from "@/hooks/use-transactions"
import { cn } from "@/lib/utils"

// Só neutral + emerald: pago = esmeralda, pendente = contorno neutro, atrasado = invertido (contraste máximo).
const TONES: Record<TransactionStatus, string> = {
    paid: "border-income/30 bg-income/10 text-income",
    pending: "border-border bg-transparent text-muted-foreground",
    overdue: "border-transparent bg-foreground text-background",
}

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
    return (
        <Badge variant="outline" className={cn("font-normal", TONES[status])}>
            {transactionStatusLabels[status]}
        </Badge>
    )
}
