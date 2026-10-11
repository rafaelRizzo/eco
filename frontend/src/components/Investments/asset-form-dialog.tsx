// Dialog de criar/editar ativo: ticker, nome, classe e cotação atual (manual).
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { DatePicker } from "@/components/date-picker"
import { MoneyInput } from "@/components/money-input"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    type Asset,
    type AssetForm,
    assetClassLabels,
    assetFormSchema,
    defaultFrequency,
    dividendFrequencyLabels,
} from "@/hooks/use-assets"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    asset: Asset | null
    onSubmit: (form: AssetForm) => Promise<boolean>
}

const classOptions = Object.entries(assetClassLabels).map(([value, label]) => ({ value, label }))

const frequencyOptions = Object.entries(dividendFrequencyLabels).map(([value, label]) => ({ value, label }))

const emptyForm: AssetForm = { ticker: "", class: "stock", dividendFrequency: "none",
    dividendPerUnit: "",
    nextDividendDate: "",
    initialQuantity: "",
    initialAvgPriceCents: 0,
    currentPriceCents: 0,
}

export function AssetFormDialog({ open, onOpenChange, asset, onSubmit }: Props) {
    const form = useForm<AssetForm>({ resolver: zodResolver(assetFormSchema), defaultValues: emptyForm })
    const { errors, isSubmitting } = form.formState

    const frequency = useWatch({ control: form.control, name: "dividendFrequency" })

    useEffect(() => {
        if (open) {
            form.reset(
                asset
                    ? {
                          ticker: asset.ticker,
                          class: asset.class,
                          dividendFrequency: asset.dividendFrequency,
                          dividendPerUnit: asset.dividendPerUnit === null ? "" : String(asset.dividendPerUnit).replace(".", ","),
                          nextDividendDate: asset.nextDividendDate ?? "",
                          initialQuantity: "",
                          initialAvgPriceCents: 0,
                          currentPriceCents: asset.currentPriceCents ?? 0,
                      }
                    : emptyForm,
            )
        }
    }, [open, asset, form])

    const submit = async (values: AssetForm) => {
        if (await onSubmit(values)) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{asset ? "Editar ativo" : "Novo ativo"}</DialogTitle>
                    <DialogDescription>Ação, FII, cripto ou dólar. A posição vem das suas operações.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                    <DialogBody>
                        <FieldGroup>
                            <Field data-invalid={!!errors.ticker}>
                                <FieldLabel htmlFor="asset-ticker">Ticker</FieldLabel>
                                <Input
                                    id="asset-ticker"
                                    placeholder="Ex: HGLG11, PETR4, BTC, USD"
                                    autoFocus
                                    className="uppercase"
                                    aria-invalid={!!errors.ticker}
                                    {...form.register("ticker")}
                                />
                                <FieldError errors={[errors.ticker]} />
                            </Field>
                            {asset ? null : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field data-invalid={!!errors.initialQuantity}>
                                        <FieldLabel htmlFor="asset-initial-qty">Quantidade</FieldLabel>
                                        <Input
                                            id="asset-initial-qty"
                                            inputMode="decimal"
                                            placeholder="Ex: 100 ou 0,05"
                                            aria-invalid={!!errors.initialQuantity}
                                            {...form.register("initialQuantity")}
                                        />
                                        <FieldError errors={[errors.initialQuantity]} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="asset-initial-price">Preço médio (R$)</FieldLabel>
                                        <Controller
                                            control={form.control}
                                            name="initialAvgPriceCents"
                                            render={({ field }) => (
                                                <MoneyInput
                                                    id="asset-initial-price"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </Field>
                                    <FieldDescription className="sm:col-span-2">
                                        Já tem esse ativo? Informe a quantidade e o preço médio pra começar com a posição certa.
                                        Opcional: deixe vazio se ainda não comprou.
                                    </FieldDescription>
                                </div>
                            )}
                            <Field>
                                <FieldLabel htmlFor="asset-class">Classe</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="class"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="asset-class"
                                            options={classOptions}
                                            value={field.value}
                                            onChange={(value) => {
                                                if (!value) return
                                                // Troca a recorrência junto só se ainda estava no padrão da classe anterior.
                                                const current = form.getValues("dividendFrequency")
                                                if (current === defaultFrequency(field.value)) {
                                                    form.setValue("dividendFrequency", defaultFrequency(value as AssetForm["class"]))
                                                }
                                                field.onChange(value)
                                            }}
                                        />
                                    )}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="asset-frequency">Recorrência dos proventos</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="dividendFrequency"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="asset-frequency"
                                            options={frequencyOptions}
                                            value={field.value}
                                            onChange={(value) => value && field.onChange(value)}
                                        />
                                    )}
                                />
                                <FieldDescription>
                                    Com recorrência, o Eco estima os próximos pagamentos dos seus proventos.
                                </FieldDescription>
                            </Field>
                            {frequency !== "none" ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field data-invalid={!!errors.dividendPerUnit}>
                                        <FieldLabel htmlFor="asset-dividend">Provento por cota (R$)</FieldLabel>
                                        <Input
                                            id="asset-dividend"
                                            inputMode="decimal"
                                            placeholder="Ex: 0,95"
                                            aria-invalid={!!errors.dividendPerUnit}
                                            {...form.register("dividendPerUnit")}
                                        />
                                        <FieldError errors={[errors.dividendPerUnit]} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="asset-next-date">Próximo pagamento</FieldLabel>
                                        <Controller
                                            control={form.control}
                                            name="nextDividendDate"
                                            render={({ field }) => (
                                                <DatePicker
                                                    id="asset-next-date"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    clearable
                                                    placeholder="Sem data"
                                                />
                                            )}
                                        />
                                    </Field>
                                    <FieldDescription className="sm:col-span-2">
                                        O valor por cota e a data do próximo pagamento alimentam a estimativa até você lançar
                                        o primeiro provento; depois ela segue o último lançado.
                                    </FieldDescription>
                                </div>
                            ) : null}
                            <Field>
                                <FieldLabel htmlFor="asset-price">Cotação atual (R$ por unidade)</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="currentPriceCents"
                                    render={({ field }) => (
                                        <MoneyInput id="asset-price" value={field.value} onChange={field.onChange} />
                                    )}
                                />
                                <FieldDescription>
                                    Para dólar, o valor em reais de US$ 1. Deixe zerado pra avaliar pelo preço médio.
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {asset ? "Salvar ativo" : "Criar ativo"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
