// Página de cartões: plásticos com limite, criar/editar/excluir; clicar abre as faturas.
import { createFileRoute } from "@tanstack/react-router"
import { CreditCardIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { CreditCardFormDialog } from "@/components/CreditCards/credit-card-form-dialog"
import { CreditCardsGrid } from "@/components/CreditCards/credit-cards-grid"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { type CreditCard, useCreditCards } from "@/hooks/use-credit-cards"

export const Route = createFileRoute("/_app/credit-cards/")({
    component: CreditCardsPage,
})

function CreditCardsPage() {
    const { creditCards, loading, createCreditCard, updateCreditCard, deleteCreditCard } = useCreditCards()
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<CreditCard | null>(null)
    const [deleting, setDeleting] = useState<CreditCard | null>(null)

    const openCreate = () => {
        setEditing(null)
        setFormOpen(true)
    }

    return (
        <>
            <PageHeader
                title="Cartões"
                description="Toque num cartão pra ver as faturas"
                actions={
                    <Button onClick={openCreate}>
                        <PlusIcon />
                        Novo cartão
                    </Button>
                }
            />

            {loading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1].map((key) => (
                        <Skeleton key={key} className="aspect-[1.586] rounded-2xl" />
                    ))}
                </div>
            ) : creditCards.length === 0 ? (
                <Empty className="border border-dashed">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CreditCardIcon />
                        </EmptyMedia>
                        <EmptyTitle>Nenhum cartão cadastrado</EmptyTitle>
                        <EmptyDescription>
                            Cadastre seu cartão com o dia de fechamento e vencimento: as compras caem sozinhas na fatura
                            certa e você é avisado antes de vencer.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={openCreate}>
                            <PlusIcon />
                            Cadastrar cartão
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <CreditCardsGrid
                    creditCards={creditCards}
                    onEdit={(card) => {
                        setEditing(card)
                        setFormOpen(true)
                    }}
                    onDelete={setDeleting}
                />
            )}

            <CreditCardFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                creditCard={editing}
                onSubmit={async (form) => (editing ? updateCreditCard(editing.id, form) : !!(await createCreditCard(form)))}
            />

            <ConfirmDeleteDialog
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Excluir ${deleting?.name ?? "cartão"}?`}
                description="Só é possível excluir cartões sem compras lançadas. Recorrências ligadas a ele também são excluídas."
                confirmLabel="Excluir cartão"
                onConfirm={() => (deleting ? deleteCreditCard(deleting.id) : Promise.resolve(false))}
            />
        </>
    )
}
