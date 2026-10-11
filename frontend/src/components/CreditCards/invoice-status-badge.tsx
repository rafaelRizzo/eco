// Badge de status da fatura (aberta/fechada/paga/atrasada).
import { Badge } from "@/components/ui/badge"
import { type InvoiceStatus, invoiceStatusLabels } from "@/hooks/use-invoices"
import { cn } from "@/lib/utils"

// Só neutral + emerald: aberta = contorno, fechada = neutro cheio, paga = esmeralda, atrasada = invertido.
const TONES: Record<InvoiceStatus, string> = {
    open: "border-border bg-transparent text-muted-foreground",
    closed: "border-transparent bg-muted text-foreground",
    paid: "border-income/30 bg-income/10 text-income",
    overdue: "border-transparent bg-foreground text-background",
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
    return (
        <Badge variant="outline" className={cn("font-normal", TONES[status])}>
            {invoiceStatusLabels[status]}
        </Badge>
    )
}
