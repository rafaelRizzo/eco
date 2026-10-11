// Grade de contas com saldo atual; cards entram em sequência (stagger do Motion).
import { BanknoteIcon, LandmarkIcon, PencilIcon, PiggyBankIcon, Trash2Icon, TrendingUpIcon, WalletIcon } from "lucide-react"
import { motion } from "motion/react"
import { Money } from "@/components/money"
import { Button } from "@/components/ui/button"
import { type Account, type AccountType, accountTypeLabels } from "@/hooks/use-accounts"

const ICONS: Record<AccountType, typeof WalletIcon> = {
    checking: LandmarkIcon,
    savings: PiggyBankIcon,
    cash: BanknoteIcon,
    investment: TrendingUpIcon,
    other: WalletIcon,
}

type Props = {
    accounts: Account[]
    onEdit: (account: Account) => void
    onDelete: (account: Account) => void
}

export function AccountsGrid({ accounts, onEdit, onDelete }: Props) {
    return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account, index) => {
                const Icon = ICONS[account.type]
                return (
                    <motion.li
                        key={account.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className="group flex flex-col gap-6 rounded-2xl border bg-card p-5"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                                <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                                    <Icon className="size-5" />
                                </span>
                                <div>
                                    <p className="font-medium">{account.name}</p>
                                    <p className="text-muted-foreground text-xs">{accountTypeLabels[account.type]}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                                <Button variant="ghost" size="icon-sm" aria-label={`Editar ${account.name}`} onClick={() => onEdit(account)}>
                                    <PencilIcon />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Excluir ${account.name}`}
                                    onClick={() => onDelete(account)}
                                    className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
                                >
                                    <Trash2Icon />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Saldo atual</p>
                            <Money cents={account.balanceCents} className="text-2xl" tone={account.balanceCents < 0 ? "signed" : "neutral"} />
                        </div>
                    </motion.li>
                )
            })}
        </ul>
    )
}
