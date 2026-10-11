// Dialog de criar/editar conta: nome, tipo e saldo inicial.
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { MoneyInput } from "@/components/money-input"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type Account, type AccountForm, accountFormSchema, accountTypeLabels } from "@/hooks/use-accounts"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    account: Account | null
    onSubmit: (form: AccountForm) => Promise<boolean>
}

const typeOptions = Object.entries(accountTypeLabels).map(([value, label]) => ({ value, label }))

const emptyForm: AccountForm = { name: "", type: "checking", initialBalanceCents: 0 }

export function AccountFormDialog({ open, onOpenChange, account, onSubmit }: Props) {
    const form = useForm<AccountForm>({ resolver: zodResolver(accountFormSchema), defaultValues: emptyForm })
    const { errors, isSubmitting } = form.formState

    useEffect(() => {
        if (open) {
            form.reset(
                account
                    ? { name: account.name, type: account.type, initialBalanceCents: account.initialBalanceCents }
                    : emptyForm,
            )
        }
    }, [open, account, form])

    const submit = async (values: AccountForm) => {
        if (await onSubmit(values)) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{account ? "Editar conta" : "Nova conta"}</DialogTitle>
                    <DialogDescription>Onde o dinheiro entra e sai: banco, carteira, poupança.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                    <DialogBody>
                        <FieldGroup>
                            <Field data-invalid={!!errors.name}>
                                <FieldLabel htmlFor="account-name">Nome</FieldLabel>
                                <Input
                                    id="account-name"
                                    placeholder="Ex: Nubank"
                                    autoFocus
                                    aria-invalid={!!errors.name}
                                    {...form.register("name")}
                                />
                                <FieldError errors={[errors.name]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="account-type">Tipo</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="account-type"
                                            options={typeOptions}
                                            value={field.value}
                                            onChange={(value) => value && field.onChange(value)}
                                        />
                                    )}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="account-balance">Saldo inicial</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="initialBalanceCents"
                                    render={({ field }) => (
                                        <MoneyInput
                                            id="account-balance"
                                            value={field.value}
                                            onChange={field.onChange}
                                            allowNegative
                                        />
                                    )}
                                />
                                <FieldDescription>
                                    Quanto tinha na conta antes de começar a usar o Eco. Digite "-" pra saldo negativo.
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {account ? "Salvar conta" : "Criar conta"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
