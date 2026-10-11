// Dialog de pagar fatura: escolhe a conta (padrão: a do cartão) e confirma o valor total.
import { useEffect, useState } from "react"
import { Money } from "@/components/money"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { useAccounts } from "@/hooks/use-accounts"
import type { Invoice } from "@/hooks/use-invoices"
import { formatMonth } from "@/lib/format"

type Props = {
    invoice: Invoice | null
    defaultAccountId: string | null
    onOpenChange: (open: boolean) => void
    onConfirm: (invoice: Invoice, accountId: string) => Promise<boolean>
}

export function PayInvoiceDialog({ invoice, defaultAccountId, onOpenChange, onConfirm }: Props) {
    const { accounts } = useAccounts()
    const [accountId, setAccountId] = useState<string | null>(defaultAccountId)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (invoice) setAccountId(defaultAccountId ?? accounts[0]?.id ?? null)
    }, [invoice, defaultAccountId, accounts])

    const confirm = async () => {
        if (!invoice || !accountId) return
        setBusy(true)
        const ok = await onConfirm(invoice, accountId)
        setBusy(false)
        if (ok) onOpenChange(false)
    }

    const account = accounts.find((a) => a.id === accountId)

    return (
        <Dialog open={!!invoice} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Pagar fatura de {invoice ? formatMonth(invoice.referenceMonth, "MMMM") : ""}
                    </DialogTitle>
                    <DialogDescription>O valor sai da conta escolhida e todas as compras da fatura ficam pagas.</DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    <div className="rounded-xl bg-muted p-4 text-center">
                        <p className="text-muted-foreground text-xs">Total da fatura</p>
                        <Money cents={invoice?.totalCents ?? 0} className="text-3xl" />
                    </div>
                    <Field>
                        <FieldLabel htmlFor="pay-account">Pagar com</FieldLabel>
                        <OptionSelect
                            id="pay-account"
                            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                            value={accountId}
                            onChange={setAccountId}
                        />
                        {account ? (
                            <p className="text-muted-foreground text-xs">
                                Saldo depois do pagamento:{" "}
                                <Money cents={account.balanceCents - (invoice?.totalCents ?? 0)} tone="signed" />
                            </p>
                        ) : null}
                    </Field>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                        Cancelar
                    </Button>
                    <Button onClick={confirm} disabled={busy || !accountId}>
                        {busy ? "Pagando..." : "Confirmar pagamento"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
