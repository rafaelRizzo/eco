// Dialog de criar/editar cartão: nome, limite, dias de fechamento/vencimento e conta que paga a fatura.
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { MoneyInput } from "@/components/money-input"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAccounts } from "@/hooks/use-accounts"
import { type CreditCard, type CreditCardForm, creditCardFormSchema } from "@/hooks/use-credit-cards"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    creditCard: CreditCard | null
    onSubmit: (form: CreditCardForm) => Promise<boolean>
}

export function CreditCardFormDialog({ open, onOpenChange, creditCard, onSubmit }: Props) {
    const { accounts } = useAccounts()
    const form = useForm<CreditCardForm>({
        resolver: zodResolver(creditCardFormSchema),
        defaultValues: { name: "", limitCents: 0, closingDay: 1, dueDay: 10, paymentAccountId: null },
    })
    const { errors, isSubmitting } = form.formState

    useEffect(() => {
        if (open) {
            form.reset(
                creditCard
                    ? {
                          name: creditCard.name,
                          limitCents: creditCard.limitCents,
                          closingDay: creditCard.closingDay,
                          dueDay: creditCard.dueDay,
                          paymentAccountId: creditCard.paymentAccountId,
                      }
                    : { name: "", limitCents: 0, closingDay: 1, dueDay: 10, paymentAccountId: accounts[0]?.id ?? null },
            )
        }
    }, [open, creditCard, accounts, form])

    const submit = async (values: CreditCardForm) => {
        if (await onSubmit(values)) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{creditCard ? "Editar cartão" : "Novo cartão"}</DialogTitle>
                    <DialogDescription>
                        Com fechamento e vencimento, o Eco coloca cada compra na fatura certa.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                    <DialogBody>
                        <FieldGroup>
                            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                                <Field data-invalid={!!errors.name}>
                                    <FieldLabel htmlFor="card-name">Nome</FieldLabel>
                                    <Input
                                        id="card-name"
                                        placeholder="Ex: Nubank Visa"
                                        autoFocus
                                        aria-invalid={!!errors.name}
                                        {...form.register("name")}
                                    />
                                    <FieldError errors={[errors.name]} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="card-limit">Limite</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="limitCents"
                                        render={({ field }) => (
                                            <MoneyInput id="card-limit" value={field.value} onChange={field.onChange} />
                                        )}
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field data-invalid={!!errors.closingDay}>
                                    <FieldLabel htmlFor="card-closing">Dia do fechamento</FieldLabel>
                                    <Input
                                        id="card-closing"
                                        type="number"
                                        min={1}
                                        max={31}
                                        className="money"
                                        {...form.register("closingDay", { valueAsNumber: true })}
                                    />
                                    <FieldError errors={[errors.closingDay]} />
                                </Field>
                                <Field data-invalid={!!errors.dueDay}>
                                    <FieldLabel htmlFor="card-due">Dia do vencimento</FieldLabel>
                                    <Input
                                        id="card-due"
                                        type="number"
                                        min={1}
                                        max={31}
                                        className="money"
                                        {...form.register("dueDay", { valueAsNumber: true })}
                                    />
                                    <FieldError errors={[errors.dueDay]} />
                                </Field>
                            </div>
                            <FieldDescription>Compra feita no dia do fechamento já entra na fatura seguinte.</FieldDescription>
                            <Field>
                                <FieldLabel htmlFor="card-account">Conta que paga a fatura</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="paymentAccountId"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="card-account"
                                            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                                            value={field.value}
                                            onChange={field.onChange}
                                            emptyLabel="Escolher na hora de pagar"
                                        />
                                    )}
                                />
                            </Field>
                        </FieldGroup>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {creditCard ? "Salvar cartão" : "Criar cartão"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
