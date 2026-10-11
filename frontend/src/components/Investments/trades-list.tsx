// Histórico de operações (mais recentes primeiro): data, ativo, compra/venda, quantidade × preço e total.
import { Trash2Icon } from "lucide-react"
import { Money } from "@/components/money"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatQuantity, type AssetTrade, tradeTypeLabels } from "@/hooks/use-asset-trades"
import { formatCents, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = { trades: AssetTrade[]; onDelete: (trade: AssetTrade) => void }

export function TradesList({ trades, onDelete }: Props) {
    return (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {trades.map((trade) => (
                <li key={trade.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium text-sm">
                            <span className="truncate">{trade.ticker}</span>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "font-normal",
                                    trade.type === "buy"
                                        ? "border-income/30 bg-income/10 text-income"
                                        : "text-muted-foreground",
                                )}
                            >
                                {tradeTypeLabels[trade.type]}
                            </Badge>
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                            {formatDate(trade.tradedAt)} · {formatQuantity(trade.quantity)} × {formatCents(trade.unitPriceCents)}
                            {trade.feesCents > 0 ? ` · taxas ${formatCents(trade.feesCents)}` : ""}
                        </p>
                    </div>
                    <Money cents={trade.totalCents} tone={trade.type === "buy" ? "expense" : "income"} className="text-sm" />
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Excluir operação"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(trade)}
                    >
                        <Trash2Icon />
                    </Button>
                </li>
            ))}
        </ul>
    )
}
