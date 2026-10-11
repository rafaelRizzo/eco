// Página de recorrências: compromisso mensal fixo, lista com pausar/retomar e CRUD.
import { createFileRoute } from "@tanstack/react-router"
import { PlusIcon, RepeatIcon } from "lucide-react"
import { useState } from "react"
import { AnimatedMoney } from "@/components/animated-money"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { PageHeader } from "@/components/page-header"
import { RecurringFormDialog } from "@/components/RecurringTransactions/recurring-form-dialog"
import { RecurringList } from "@/components/RecurringTransactions/recurring-list"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useCreditCards } from "@/hooks/use-credit-cards"
import { type RecurringTransaction, useRecurringTransactions } from "@/hooks/use-recurring-transactions"

export const Route = createFileRoute("/_app/recurring")({
    staticData: { crumb: "Recorrências" },
    component: RecurringPage,
})

function RecurringPage() {
    const {
        recurringTransactions,
        monthlyCommitmentCents,
        loading,
        createRecurring,
        updateRecurring,
        setActive,
        deleteRecurring,
    } = useRecurringTransactions()
    const { byId: categories } = useCategories()
    const { accounts } = useAccounts()
    const { creditCards } = useCreditCards()
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<RecurringTransaction | null>(null)
    const [deleting, setDeleting] = useState<RecurringTransaction | null>(null)

    const openCreate = () => {
        setEditing(null)
        setFormOpen(true)
    }
    const canCreate = accounts.length > 0 || creditCards.length > 0

    return (
        <>
            <PageHeader
                title="Recorrências"
                description={
                    recurringTransactions.length ? (
                        <>
                            Compromisso fixo por mês:{" "}
                            <AnimatedMoney cents={monthlyCommitmentCents} className="text-expense" />
                        </>
                    ) : (
                        "Mensalidades, assinaturas e receitas fixas"
                    )
                }
                actions={
                    <Button onClick={openCreate} disabled={!canCreate}>
                        <PlusIcon />
                        Nova recorrência
                    </Button>
                }
            />

            {loading ? (
                <Skeleton className="h-64 rounded-2xl" />
            ) : recurringTransactions.length === 0 ? (
                <Empty className="border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <RepeatIcon />
                        </EmptyMedia>
                        <EmptyTitle>Nenhuma recorrência</EmptyTitle>
                        <EmptyDescription>
                            {canCreate
                                ? "Cadastre aluguel, internet, academia e assinaturas uma vez: o Eco lança cada mês e avisa antes de vencer."
                                : "Cadastre uma conta ou cartão primeiro."}
                        </EmptyDescription>
                    </EmptyHeader>
                    {canCreate ? (
                        <EmptyContent>
                            <Button onClick={openCreate}>
                                <PlusIcon />
                                Nova recorrência
                            </Button>
                        </EmptyContent>
                    ) : null}
                </Empty>
            ) : (
                <RecurringList
                    items={recurringTransactions}
                    categories={categories}
                    accounts={accounts}
                    creditCards={creditCards}
                    onEdit={(item) => {
                        setEditing(item)
                        setFormOpen(true)
                    }}
                    onDelete={setDeleting}
                    onToggle={(item, active) => setActive(item.id, active)}
                />
            )}

            {editing ? (
                <RecurringFormDialog
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    recurring={editing}
                    onUpdate={(form) => updateRecurring(editing.id, form)}
                />
            ) : (
                <RecurringFormDialog
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    recurring={null}
                    onCreate={async (form) => !!(await createRecurring(form))}
                />
            )}

            <ConfirmDeleteDialog
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Excluir "${deleting?.description ?? ""}"?`}
                description="Para de gerar novas cobranças. Os lançamentos que já foram criados continuam no extrato."
                confirmLabel="Excluir recorrência"
                onConfirm={() => (deleting ? deleteRecurring(deleting.id) : Promise.resolve(false))}
            />
        </>
    )
}
