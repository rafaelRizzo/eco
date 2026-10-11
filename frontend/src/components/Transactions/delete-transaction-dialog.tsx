// Confirmação de exclusão de lançamento; em compra parcelada oferece excluir todas as parcelas.
import { useEffect, useState } from "react"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import type { Transaction } from "@/hooks/use-transactions"

type Props = {
    transaction: Transaction | null
    onOpenChange: (open: boolean) => void
    onConfirm: (transaction: Transaction, allInstallments: boolean) => Promise<boolean>
}

export function DeleteTransactionDialog({ transaction, onOpenChange, onConfirm }: Props) {
    const [allInstallments, setAllInstallments] = useState(false)

    useEffect(() => {
        if (transaction) setAllInstallments(false)
    }, [transaction])

    return (
        <ConfirmDeleteDialog
            open={!!transaction}
            onOpenChange={onOpenChange}
            title={`Excluir "${transaction?.description ?? ""}"?`}
            description={
                transaction?.creditCardId
                    ? "Lançamentos em fatura já paga não podem ser excluídos."
                    : "O saldo da conta é recalculado na hora."
            }
            confirmLabel={allInstallments ? "Excluir todas as parcelas" : "Excluir lançamento"}
            onConfirm={() => (transaction ? onConfirm(transaction, allInstallments) : Promise.resolve(false))}
        >
            {transaction?.installmentTotal ? (
                <Field orientation="horizontal">
                    <Checkbox
                        id="delete-all-installments"
                        checked={allInstallments}
                        onCheckedChange={(checked) => setAllInstallments(checked === true)}
                    />
                    <FieldLabel htmlFor="delete-all-installments" className="font-normal">
                        Excluir as {transaction.installmentTotal} parcelas desta compra
                    </FieldLabel>
                </Field>
            ) : null}
        </ConfirmDeleteDialog>
    )
}
