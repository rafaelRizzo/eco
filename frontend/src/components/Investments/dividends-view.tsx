// Aba de proventos: cards dos próximos meses (clicáveis), navegação por mês e lista com situação de cada provento.
import { CheckIcon, CoinsIcon, EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { MonthDividendCard } from "@/components/Investments/month-dividend-card"
import { Money } from "@/components/money"
import { MonthPicker } from "@/components/month-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
    type Dividend,
    type DividendStatus,
    dividendKindLabels,
    dividendStatusLabels,
    formatPerUnit,
    useDividends,
    useUpcomingDividends,
} from "@/hooks/use-dividends"
import { formatQuantity } from "@/hooks/use-asset-trades"
import { capitalizeFirst, formatDate, formatMonth, todayKey } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
    month: string
    onMonthChange: (month: string) => void
    onCreate: () => void
    onEdit: (dividend: Dividend) => void
    // Confirmar recebimento (estimado ou lançado ainda não creditado): escolhe a conta e gera a receita.
    onReceive: (dividend: Dividend) => void
    onDelete: (dividend: Dividend) => void
    // Para o estado vazio: sem ativos, lançar provento não faz sentido ainda.
    hasAssets: boolean
}

// Só neutral + emerald: recebido = esmeralda, a receber = contorno neutro, estimado = tracejado.
type RowStatus = DividendStatus | "due"

const STATUS_LABELS: Record<RowStatus, string> = { ...dividendStatusLabels, due: "Confirmar" }

const STATUS_TONES: Record<RowStatus, string> = {
    due: "border-transparent bg-foreground text-background",
    received: "border-income/30 bg-income/10 text-income",
    pending: "border-border bg-transparent text-muted-foreground",
    estimated: "border-dashed border-border bg-transparent text-muted-foreground",
}

const rowStatus = (dividend: Dividend): RowStatus =>
    dividend.status === "estimated" && dividend.payDate <= todayKey() ? "due" : dividend.status

export function DividendsView({ month, onMonthChange, onCreate, onEdit, onReceive, onDelete, hasAssets }: Props) {
    const { dividends, totals, loading } = useDividends(month)
    const { upcoming } = useUpcomingDividends(3)

    return (
        <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
                {upcoming.map((item, index) => (
                    <MonthDividendCard
                        key={item.month}
                        label={
                            index === 0
                                ? "Este mês"
                                : index === 1
                                  ? "Próximo mês"
                                  : capitalizeFirst(formatMonth(item.month, "MMMM"))
                        }
                        totals={item}
                        selected={item.month === month}
                        onSelect={() => onMonthChange(item.month)}
                    />
                ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <MonthPicker month={month} onChange={onMonthChange} />
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-muted-foreground">
                        Recebido <Money cents={totals.receivedCents} className="text-foreground" />
                    </span>
                    <span className="text-muted-foreground">
                        A receber <Money cents={totals.pendingCents} className="text-foreground" />
                    </span>
                    <span className="text-muted-foreground">
                        Estimado <Money cents={totals.estimatedCents} className="text-foreground" />
                    </span>
                </div>
            </div>

            {loading ? (
                <Skeleton className="h-48 rounded-2xl" />
            ) : dividends.length === 0 ? (
                <Empty className="border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CoinsIcon />
                        </EmptyMedia>
                        <EmptyTitle>Nenhum provento em {formatMonth(month)}</EmptyTitle>
                        <EmptyDescription>
                            {hasAssets
                                ? "Registre dividendos, JCP e rendimentos de FII pra acompanhar o que entra por mês."
                                : "Cadastre um ativo primeiro, depois registre os proventos dele."}
                        </EmptyDescription>
                    </EmptyHeader>
                    {hasAssets ? (
                        <EmptyContent>
                            <Button onClick={onCreate}>
                                <PlusIcon />
                                Registrar provento
                            </Button>
                        </EmptyContent>
                    ) : null}
                </Empty>
            ) : (
                <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                    {dividends.map((dividend) => (
                        <li key={dividend.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-sm">{dividend.ticker}</p>
                                <p className="truncate text-muted-foreground text-xs">
                                    {dividend.status === "estimated" ? "Estimativa" : dividendKindLabels[dividend.kind]} ·{" "}
                                    {formatDate(dividend.payDate)} · {formatPerUnit(dividend.amountPerUnit)} por cota ×{" "}
                                    {formatQuantity(dividend.quantity)}
                                    {dividend.transactionId ? " · na conta" : ""}
                                </p>
                            </div>
                            <Badge variant="outline" className={cn("hidden font-normal sm:inline-flex", STATUS_TONES[rowStatus(dividend)])}>
                                {STATUS_LABELS[rowStatus(dividend)]}
                            </Badge>
                            <Money cents={dividend.totalCents} tone="income" className="text-sm" />
                            {dividend.status === "estimated" ? (
                                <Button variant="outline" size="sm" onClick={() => onReceive(dividend)}>
                                    <CheckIcon />
                                    Receber
                                </Button>
                            ) : (
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={<Button variant="ghost" size="icon-sm" aria-label="Ações do provento" />}
                                    >
                                        <EllipsisIcon />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {dividend.transactionId === null ? (
                                            <DropdownMenuItem onClick={() => onReceive(dividend)}>
                                                <CheckIcon />
                                                Marcar como recebido
                                            </DropdownMenuItem>
                                        ) : null}
                                        <DropdownMenuItem onClick={() => onEdit(dividend)}>
                                            <PencilIcon />
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(dividend)}>
                                            <Trash2Icon />
                                            Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
