// Lista de recorrências: valor, frequência, próxima cobrança, onde cai e chave de pausar/retomar.
import { CreditCardIcon, LandmarkIcon, PencilIcon, Trash2Icon, ZapIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Money } from "@/components/money"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { Account } from "@/hooks/use-accounts"
import type { Category } from "@/hooks/use-categories"
import type { CreditCard } from "@/hooks/use-credit-cards"
import { frequencyLabels, type RecurringTransaction } from "@/hooks/use-recurring-transactions"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
    items: RecurringTransaction[]
    categories: Map<string, Category>
    accounts: Account[]
    creditCards: CreditCard[]
    onEdit: (item: RecurringTransaction) => void
    onDelete: (item: RecurringTransaction) => void
    onToggle: (item: RecurringTransaction, active: boolean) => void
}

export function RecurringList({ items, categories, accounts, creditCards, onEdit, onDelete, onToggle }: Props) {
    return (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            <AnimatePresence initial={false}>
                {items.map((item, index) => {
                    const category = item.categoryId ? categories.get(item.categoryId) : undefined
                    const origin = item.creditCardId
                        ? { icon: CreditCardIcon, name: creditCards.find((c) => c.id === item.creditCardId)?.name }
                        : { icon: LandmarkIcon, name: accounts.find((a) => a.id === item.accountId)?.name }
                    const OriginIcon = origin.icon

                    return (
                        <motion.li
                            key={item.id}
                            layout="position"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4", !item.active && "opacity-60")}
                        >
                            <Switch
                                checked={item.active}
                                onCheckedChange={(checked) => onToggle(item, checked)}
                                aria-label={item.active ? `Pausar ${item.description}` : `Retomar ${item.description}`}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2 font-medium text-sm">
                                    <span
                                        className="swatch size-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: category?.color ?? "var(--border)" }}
                                    />
                                    <span className="truncate">{item.description}</span>
                                    {item.autoPay ? (
                                        <Badge variant="outline" className="gap-1 font-normal">
                                            <ZapIcon className="size-3" />
                                            Automático
                                        </Badge>
                                    ) : null}
                                </p>
                                <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    {frequencyLabels[item.frequency]}
                                    <span aria-hidden>·</span>
                                    <OriginIcon className="size-3.5" />
                                    {origin.name ?? "-"}
                                    <span aria-hidden>·</span>
                                    {item.active ? (
                                        <>
                                            próxima em <span className="money text-foreground">{formatDate(item.nextRunDate)}</span>
                                        </>
                                    ) : item.endDate && item.nextRunDate > item.endDate ? (
                                        "encerrada"
                                    ) : (
                                        "pausada"
                                    )}
                                </p>
                            </div>
                            <Money
                                cents={item.amountCents}
                                tone={item.type === "income" ? "income" : "expense"}
                                className="text-sm"
                            />
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon-sm" aria-label={`Editar ${item.description}`} onClick={() => onEdit(item)}>
                                    <PencilIcon />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Excluir ${item.description}`}
                                    onClick={() => onDelete(item)}
                                    className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
                                >
                                    <Trash2Icon />
                                </Button>
                            </div>
                        </motion.li>
                    )
                })}
            </AnimatePresence>
        </ul>
    )
}
