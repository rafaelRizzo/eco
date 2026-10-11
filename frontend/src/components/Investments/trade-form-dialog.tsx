// Dialog de registrar compra/venda: ativo, quantidade (fracionada), preço unitário, taxas e data.
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { DatePicker } from "@/components/date-picker"
import { MoneyInput } from "@/components/money-input"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type TradeForm, tradeFormSchema, tradeTypeLabels } from "@/hooks/use-asset-trades"
import { type Asset, assetLabel } from "@/hooks/use-assets"
import { todayKey } from "@/lib/format"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    assets: Asset[]
    // Ativo pré-selecionado (ação "Nova operação" na linha do ativo).
    defaultAssetId?: string | null
    onSubmit: (form: TradeForm) => Promise<boolean>
}

const typeOptions = Object.entries(tradeTypeLabels).map(([value, label]) => ({ value, label }))

const emptyForm = (assetId: string): TradeForm => ({
    assetId,
    type: "buy",
    quantity: "",
    unitPriceCents: 0,
    feesCents: 0,
    tradedAt: todayKey(),
    notes: "",
})

export function TradeFormDialog({ open, onOpenChange, assets, defaultAssetId, onSubmit }: Props) {
    const form = useForm<TradeForm>({ resolver: zodResolver(tradeFormSchema), defaultValues: emptyForm("") })
    const { errors, isSubmitting } = form.formState
    const assetOptions = assets.map((asset) => ({ value: asset.id, label: assetLabel(asset) }))

    useEffect(() => {
        if (open) form.reset(emptyForm(defaultAssetId ?? ""))
    }, [open, defaultAssetId, form])

    const submit = async (values: TradeForm) => {
        if (await onSubmit(values)) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nova operação</DialogTitle>
                    <DialogDescription>O preço médio e a quantidade em carteira são recalculados.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                    <DialogBody>
                        <FieldGroup>
                            <Field data-invalid={!!errors.assetId}>
                                <FieldLabel htmlFor="trade-asset">Ativo</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="assetId"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="trade-asset"
                                            options={assetOptions}
                                            value={field.value || null}
                                            onChange={(value) => field.onChange(value ?? "")}
                                            placeholder="Escolha o ativo"
                                            invalid={!!errors.assetId}
                                        />
                                    )}
                                />
                                <FieldError errors={[errors.assetId]} />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field>
                                    <FieldLabel htmlFor="trade-type">Tipo</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <OptionSelect
                                                id="trade-type"
                                                options={typeOptions}
                                                value={field.value}
                                                onChange={(value) => value && field.onChange(value)}
                                            />
                                        )}
                                    />
                                </Field>
                                <Field data-invalid={!!errors.tradedAt}>
                                    <FieldLabel htmlFor="trade-date">Data</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="tradedAt"
                                        render={({ field }) => (
                                            <DatePicker
                                                id="trade-date"
                                                value={field.value}
                                                onChange={field.onChange}
                                                invalid={!!errors.tradedAt}
                                            />
                                        )}
                                    />
                                    <FieldError errors={[errors.tradedAt]} />
                                </Field>
                            </div>
                            <Field data-invalid={!!errors.quantity}>
                                <FieldLabel htmlFor="trade-quantity">Quantidade</FieldLabel>
                                <Input
                                    id="trade-quantity"
                                    inputMode="decimal"
                                    placeholder="Ex: 10 ou 0,05"
                                    aria-invalid={!!errors.quantity}
                                    {...form.register("quantity")}
                                />
                                <FieldError errors={[errors.quantity]} />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field>
                                    <FieldLabel htmlFor="trade-price">Preço unitário</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="unitPriceCents"
                                        render={({ field }) => (
                                            <MoneyInput id="trade-price" value={field.value} onChange={field.onChange} />
                                        )}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="trade-fees">Taxas</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="feesCents"
                                        render={({ field }) => (
                                            <MoneyInput id="trade-fees" value={field.value} onChange={field.onChange} />
                                        )}
                                    />
                                </Field>
                            </div>
                            <FieldDescription>
                                Valores em reais. Para dólar e cripto, use o preço em R$ de 1 unidade na data.
                            </FieldDescription>
                            <Field data-invalid={!!errors.notes}>
                                <FieldLabel htmlFor="trade-notes">Observação (opcional)</FieldLabel>
                                <Input id="trade-notes" aria-invalid={!!errors.notes} {...form.register("notes")} />
                                <FieldError errors={[errors.notes]} />
                            </Field>
                        </FieldGroup>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            Registrar operação
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
