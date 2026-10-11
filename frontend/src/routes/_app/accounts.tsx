// Página de contas: grade com saldo, total consolidado, criar/editar/excluir.
import { createFileRoute } from "@tanstack/react-router"
import { PlusIcon, WalletIcon } from "lucide-react"
import { useState } from "react"
import { AccountFormDialog } from "@/components/Accounts/account-form-dialog"
import { AccountsGrid } from "@/components/Accounts/accounts-grid"
import { AnimatedMoney } from "@/components/animated-money"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { type Account, useAccounts } from "@/hooks/use-accounts"

export const Route = createFileRoute("/_app/accounts")({
    staticData: { crumb: "Contas" },
    component: AccountsPage,
})

function AccountsPage() {
    const { accounts, totalBalanceCents, loading, createAccount, updateAccount, deleteAccount } = useAccounts()
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Account | null>(null)
    const [deleting, setDeleting] = useState<Account | null>(null)

    const openCreate = () => {
        setEditing(null)
        setFormOpen(true)
    }

    return (
        <>
            <PageHeader
                title="Contas"
                description={
                    accounts.length ? (
                        <>
                            Saldo somado: <AnimatedMoney cents={totalBalanceCents} className="text-foreground" />
                        </>
                    ) : (
                        "Bancos, carteira e poupança"
                    )
                }
                actions={
                    <Button onClick={openCreate}>
                        <PlusIcon />
                        Nova conta
                    </Button>
                }
            />

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((key) => (
                        <Skeleton key={key} className="h-40 rounded-2xl" />
                    ))}
                </div>
            ) : accounts.length === 0 ? (
                <Empty className="border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <WalletIcon />
                        </EmptyMedia>
                        <EmptyTitle>Nenhuma conta ainda</EmptyTitle>
                        <EmptyDescription>
                            Cadastre a conta onde seu salário cai, é dela que saem os pagamentos e as faturas.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={openCreate}>
                            <PlusIcon />
                            Cadastrar primeira conta
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <AccountsGrid
                    accounts={accounts}
                    onEdit={(account) => {
                        setEditing(account)
                        setFormOpen(true)
                    }}
                    onDelete={setDeleting}
                />
            )}

            <AccountFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                account={editing}
                onSubmit={async (form) => (editing ? updateAccount(editing.id, form) : !!(await createAccount(form)))}
            />

            <ConfirmDeleteDialog
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Excluir ${deleting?.name ?? "conta"}?`}
                description="Só é possível excluir contas sem lançamentos. Essa ação não pode ser desfeita."
                confirmLabel="Excluir conta"
                onConfirm={() => (deleting ? deleteAccount(deleting.id) : Promise.resolve(false))}
            />
        </>
    )
}
