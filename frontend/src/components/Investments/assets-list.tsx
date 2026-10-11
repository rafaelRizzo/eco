// Lista da carteira: uma linha por ativo com valor atual, quantidade, preço médio e lucro/prejuízo.
import { ArrowLeftRightIcon, EllipsisIcon, PencilIcon, TagIcon, Trash2Icon } from "lucide-react"
import { motion } from "motion/react"
import { Money } from "@/components/money"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Asset, assetClassLabels, dividendFrequencyLabels } from "@/hooks/use-assets"
import { formatQuantity } from "@/hooks/use-asset-trades"
import { formatCents } from "@/lib/format"

type Props = {
    assets: Asset[]
    onTrade: (asset: Asset) => void
    onPrice: (asset: Asset) => void
    onEdit: (asset: Asset) => void
    onDelete: (asset: Asset) => void
}

export function AssetsList({ assets, onTrade, onPrice, onEdit, onDelete }: Props) {
    return (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {assets.map((asset, index) => (
                <motion.li
                    key={asset.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-center gap-3 px-4 py-3"
                >
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium text-sm">
                            <span className="truncate">{asset.ticker}</span>
                            <Badge variant="outline" className="font-normal text-muted-foreground">
                                {assetClassLabels[asset.class]}
                            </Badge>
                            {asset.dividendFrequency !== "none" ? (
                                <Badge variant="outline" className="font-normal text-muted-foreground">
                                    Proventos {dividendFrequencyLabels[asset.dividendFrequency].toLowerCase()}
                                </Badge>
                            ) : null}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                            {asset.quantity > 0 ? (
                                <>
                                    {formatQuantity(asset.quantity)} un. · PM {formatCents(asset.avgPriceCents)}
                                </>
                            ) : (
                                "Sem posição"
                            )}
                            {asset.priceMissing && asset.quantity > 0 ? " · sem cotação" : ""}
                        </p>
                    </div>
                    <div className="text-right">
                        <Money cents={asset.valueCents} className="text-sm" />
                        {asset.quantity > 0 ? (
                            <p className="flex items-center justify-end gap-1.5 text-xs">
                                <Money cents={asset.profitCents} tone="signed" />
                                {asset.profitPercent !== null ? (
                                    <span className="money text-muted-foreground">
                                        ({asset.profitPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)
                                    </span>
                                ) : null}
                            </p>
                        ) : null}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações do ativo" />}>
                            <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onTrade(asset)}>
                                <ArrowLeftRightIcon />
                                Nova operação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPrice(asset)}>
                                <TagIcon />
                                Atualizar cotação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(asset)}>
                                <PencilIcon />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => onDelete(asset)}>
                                <Trash2Icon />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </motion.li>
            ))}
        </ul>
    )
}
