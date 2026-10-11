// Dialog rápido pra atualizar a cotação manual de um ativo.
import { useEffect, useState } from "react"
import { MoneyInput } from "@/components/money-input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { type Asset, assetLabel } from "@/hooks/use-assets"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    asset: Asset | null
    onSubmit: (cents: number) => Promise<boolean>
}

export function PriceDialog({ open, onOpenChange, asset, onSubmit }: Props) {
    const [cents, setCents] = useState(0)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (open) setCents(asset?.currentPriceCents ?? 0)
    }, [open, asset])

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setBusy(true)
        const ok = await onSubmit(cents)
        setBusy(false)
        if (ok) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Atualizar cotação</DialogTitle>
                    <DialogDescription>{asset ? assetLabel(asset) : null}</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} noValidate className="contents">
                    <DialogBody>
                        <Field>
                            <FieldLabel htmlFor="price-value">Preço de 1 unidade (R$)</FieldLabel>
                            <MoneyInput id="price-value" value={cents} onChange={setCents} autoFocus />
                            <FieldDescription>Zere pra voltar a avaliar pelo preço médio.</FieldDescription>
                        </Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={busy}>
                            Salvar cotação
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
