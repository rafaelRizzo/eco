// Grade de cartões: cada um é um "plástico" com nome, ciclo (fecha/vence) e barra de limite; clicar abre as faturas.
import { Link } from "@tanstack/react-router"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import type { CreditCard } from "@/hooks/use-credit-cards"
import { LimitBar } from "./limit-bar"

type Props = {
    creditCards: CreditCard[]
    onEdit: (creditCard: CreditCard) => void
    onDelete: (creditCard: CreditCard) => void
}

export function CreditCardsGrid({ creditCards, onEdit, onDelete }: Props) {
    return (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creditCards.map((card, index) => (
                <motion.li
                    key={card.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="group space-y-3"
                >
                    <Link
                        to="/credit-cards/$id"
                        params={{ id: card.id }}
                        className="relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-sidebar via-sidebar to-sidebar-accent p-5 text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {/* Faixas da régua no plástico: fechamento (esmeralda) e vencimento (neutro) no mês. */}
                        <span aria-hidden className="absolute inset-x-5 top-1/2 h-px bg-sidebar-foreground/15">
                            <span
                                className="absolute -top-2.5 h-5 w-1 rounded-full bg-sidebar-primary"
                                style={{ left: `${((card.closingDay - 1) / 30) * 100}%` }}
                            />
                            <span
                                className="absolute -top-2.5 h-5 w-1 rounded-full bg-sidebar-foreground"
                                style={{ left: `${((card.dueDay - 1) / 30) * 100}%` }}
                            />
                        </span>
                        <span className="font-heading font-semibold text-lg">{card.name}</span>
                        <span className="flex justify-between text-sidebar-foreground/70 text-xs">
                            <span>
                                Fecha dia <span className="money text-sidebar-primary">{card.closingDay}</span>
                            </span>
                            <span>
                                Vence dia <span className="money text-sidebar-accent-foreground">{card.dueDay}</span>
                            </span>
                        </span>
                    </Link>
                    <LimitBar usedCents={card.usedLimitCents} limitCents={card.limitCents} />
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(card)}>
                            <PencilIcon />
                            Editar
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(card)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
                        >
                            <Trash2Icon />
                            Excluir
                        </Button>
                    </div>
                </motion.li>
            ))}
        </ul>
    )
}
