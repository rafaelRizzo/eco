// Dialog de registrar/editar provento: ativo, tipo, valor por cota, cotas e datas; o total é calculado.
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { DatePicker } from "@/components/date-picker"
import { Money } from "@/components/money"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Account } from "@/hooks/use-accounts"
import { formatQuantity, parseQuantity } from "@/hooks/use-asset-trades"
import { type Asset, assetLabel } from "@/hooks/use-assets"
import {
    type Dividend,
    type DividendForm,
    dividendFormSchema,
    dividendKindLabels,
    parsePerUnit,
} from "@/hooks/use-dividends"
import { todayKey } from "@/lib/format"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    assets: Asset[]
    accounts: Account[]
    dividend: Dividend | null
    // Confirmar recebimento: pede a conta (obrigatória) e já usa a data/valor do estimado.
    receiving?: boolean
    onSubmit: (form: DividendForm) => Promise<boolean>
}

const kindOptions = Object.entries(dividendKindLabels).map(([value, label]) => ({ value, label }))

const emptyForm: DividendForm = {
    assetId: "",
    kind: "yield",
    quantity: "",
    amountPerUnit: "",
    comDate: "",
    payDate: todayKey(),
    accountId: "",
}

const toText = (value: number) => String(value).replace(".", ",")

export function DividendFormDialog({
    open,
    onOpenChange,
    assets,
    accounts,
    dividend,
    receiving = false,
    onSubmit,
}: Props) {
    const form = useForm<DividendForm>({ resolver: zodResolver(dividendFormSchema), defaultValues: emptyForm })
    const { errors, isSubmitting } = form.formState
    const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }))
    const credited = dividend?.transactionId != null
    const assetOptions = assets.map((asset) => ({ value: asset.id, label: assetLabel(asset) }))

    const [assetId, quantityText, perUnitText] = useWatch({ control: form.control, name: ["assetId", "quantity", "amountPerUnit"] })
    const position = assets.find((asset) => asset.id === assetId)?.quantity ?? 0
    // Cotas vazias = posição atual do ativo (o backend aplica a mesma regra).
    const units = quantityText.trim() ? parseQuantity(quantityText) : position
    const perUnit = parsePerUnit(perUnitText || "0")
    const totalCents = Number.isFinite(units) && Number.isFinite(perUnit) ? Math.round(units * perUnit * 100) : 0

    useEffect(() => {
        if (!open) return
        form.reset(
            dividend
                ? {
                      assetId: dividend.assetId,
                      kind: dividend.kind,
                      quantity: toText(dividend.quantity),
                      amountPerUnit: toText(dividend.amountPerUnit),
                      comDate: dividend.comDate ?? "",
                      payDate: dividend.payDate,
                      accountId: "",
                  }
                : { ...emptyForm, payDate: todayKey() },
        )
    }, [open, dividend, form])

    const submit = async (values: DividendForm) => {
        if (receiving && !values.accountId) {
            form.setError("accountId", { message: "Escolha a conta que recebeu" })
            return
        }
        if (await onSubmit(values)) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{receiving ? "Confirmar recebimento" : dividend ? "Editar provento" : "Novo provento"}</DialogTitle>
                    <DialogDescription>
                        {receiving
                            ? "Ajuste o valor real e escolha a conta: o provento entra no saldo e em Entradas."
                            : "Dividendo, JCP ou rendimento de FII, já a receber ou recebido."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                    <DialogBody>
                        <FieldGroup>
                            <Field data-invalid={!!errors.assetId}>
                                <FieldLabel htmlFor="dividend-asset">Ativo</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="assetId"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="dividend-asset"
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
                            <Field>
                                <FieldLabel htmlFor="dividend-kind">Tipo</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="kind"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="dividend-kind"
                                            options={kindOptions}
                                            value={field.value}
                                            onChange={(value) => value && field.onChange(value)}
                                        />
                                    )}
                                />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field data-invalid={!!errors.amountPerUnit}>
                                    <FieldLabel htmlFor="dividend-per-unit">Valor por cota (R$)</FieldLabel>
                                    <Input
                                        id="dividend-per-unit"
                                        inputMode="decimal"
                                        placeholder="Ex: 0,95"
                                        aria-invalid={!!errors.amountPerUnit}
                                        {...form.register("amountPerUnit")}
                                    />
                                    <FieldError errors={[errors.amountPerUnit]} />
                                </Field>
                                <Field data-invalid={!!errors.quantity}>
                                    <FieldLabel htmlFor="dividend-quantity">Cotas</FieldLabel>
                                    <Input
                                        id="dividend-quantity"
                                        inputMode="decimal"
                                        placeholder={position > 0 ? `Posição: ${formatQuantity(position)}` : "Ex: 100"}
                                        aria-invalid={!!errors.quantity}
                                        {...form.register("quantity")}
                                    />
                                    <FieldError errors={[errors.quantity]} />
                                </Field>
                            </div>
                            <FieldDescription>
                                Total a receber: <Money cents={totalCents} className="text-foreground" />. Cotas vazias usam
                                a sua posição atual no ativo.
                            </FieldDescription>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field data-invalid={!!errors.payDate}>
                                    <FieldLabel htmlFor="dividend-pay">Data de pagamento</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="payDate"
                                        render={({ field }) => (
                                            <DatePicker
                                                id="dividend-pay"
                                                value={field.value}
                                                onChange={field.onChange}
                                                invalid={!!errors.payDate}
                                            />
                                        )}
                                    />
                                    <FieldError errors={[errors.payDate]} />
                                </Field>
                                <Field data-invalid={!!errors.comDate}>
                                    <FieldLabel htmlFor="dividend-com">Data com (opcional)</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="comDate"
                                        render={({ field }) => (
                                            <DatePicker
                                                id="dividend-com"
                                                value={field.value}
                                                onChange={field.onChange}
                                                invalid={!!errors.comDate}
                                                clearable
                                                placeholder="Sem data"
                                            />
                                        )}
                                    />
                                    <FieldDescription>Último dia pra ter o ativo e ter direito ao provento.</FieldDescription>
                                    <FieldError errors={[errors.comDate]} />
                                </Field>
                            </div>
                            {credited ? (
                                <FieldDescription>Esse provento já foi creditado em uma conta.</FieldDescription>
                            ) : (
                                <Field data-invalid={!!errors.accountId}>
                                    <FieldLabel htmlFor="dividend-account">
                                        {receiving ? "Conta que recebeu" : "Creditar em conta (opcional)"}
                                    </FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="accountId"
                                        render={({ field }) => (
                                            <OptionSelect
                                                id="dividend-account"
                                                options={accountOptions}
                                                value={field.value || null}
                                                onChange={(value) => field.onChange(value ?? "")}
                                                emptyLabel={receiving ? undefined : "Não creditar em conta"}
                                                placeholder="Escolha a conta"
                                                invalid={!!errors.accountId}
                                            />
                                        )}
                                    />
                                    <FieldError errors={[errors.accountId]} />
                                </Field>
                            )}
                        </FieldGroup>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {receiving ? "Confirmar recebimento" : dividend ? "Salvar provento" : "Registrar provento"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
