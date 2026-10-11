// Dialog de recorrência: criar (mensalidade/assinatura/salário em conta ou cartão) ou editar valor, categoria e fim.
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { MoneyInput } from "@/components/money-input"
import { DatePicker } from "@/components/date-picker"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useCreditCards } from "@/hooks/use-credit-cards"
import {
    frequencyLabels,
    type RecurringForm,
    type RecurringTransaction,
    type RecurringUpdateForm,
    recurringFormSchema,
    recurringUpdateSchema,
} from "@/hooks/use-recurring-transactions"
import { todayKey } from "@/lib/format"

type Props =
    | {
          open: boolean
          onOpenChange: (open: boolean) => void
          recurring: null
          onCreate: (form: RecurringForm) => Promise<boolean>
          onUpdate?: never
      }
    | {
          open: boolean
          onOpenChange: (open: boolean) => void
          recurring: RecurringTransaction
          onCreate?: never
          onUpdate: (form: RecurringUpdateForm) => Promise<boolean>
      }

const frequencyOptions = Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))

export function RecurringFormDialog(props: Props) {
    const { open, onOpenChange, recurring } = props
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                {recurring ? (
                    <EditForm recurring={recurring} onCancel={() => onOpenChange(false)} onSubmit={props.onUpdate!} />
                ) : (
                    <CreateForm open={open} onCancel={() => onOpenChange(false)} onSubmit={props.onCreate!} />
                )}
            </DialogContent>
        </Dialog>
    )
}

function CreateForm({
    open,
    onCancel,
    onSubmit,
}: {
    open: boolean
    onCancel: () => void
    onSubmit: (form: RecurringForm) => Promise<boolean>
}) {
    const { accounts } = useAccounts()
    const { creditCards } = useCreditCards()
    const { categories } = useCategories()

    const defaults = useMemo<RecurringForm>(
        () => ({
            description: "",
            amountCents: 0,
            type: "expense",
            frequency: "monthly",
            categoryId: null,
            target: "account",
            accountId: accounts[0]?.id ?? null,
            creditCardId: creditCards[0]?.id ?? null,
            startDate: todayKey(),
            endDate: "",
            autoPay: false,
        }),
        [accounts, creditCards],
    )

    const form = useForm<RecurringForm>({ resolver: zodResolver(recurringFormSchema), defaultValues: defaults })
    const { errors, isSubmitting } = form.formState
    const [type, target] = useWatch({ control: form.control, name: ["type", "target"] })

    useEffect(() => {
        if (open) form.reset(defaults)
    }, [open, defaults, form])

    const categoryOptions = categories
        .filter((category) => category.type === type)
        .map((category) => ({ value: category.id, label: category.name, color: category.color }))

    const submit = async (values: RecurringForm) => {
        if (await onSubmit(values)) onCancel()
    }

    return (
        <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
            <DialogHeader>
                <DialogTitle>Nova recorrência</DialogTitle>
                <DialogDescription>
                    Aluguel, internet, streaming, salário: o Eco lança sozinho alguns dias antes de cada vencimento.
                </DialogDescription>
            </DialogHeader>
            <DialogBody>
                <FieldGroup>
                    <Controller
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <Tabs
                                value={field.value}
                                onValueChange={(value) => {
                                    field.onChange(value)
                                    form.setValue("categoryId", null)
                                    if (value === "income") form.setValue("target", "account")
                                }}
                            >
                                <TabsList className="w-full">
                                    <TabsTrigger value="expense">Conta a pagar</TabsTrigger>
                                    <TabsTrigger value="income">Receita fixa</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                    />
                    <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
                        <Field data-invalid={!!errors.description}>
                            <FieldLabel htmlFor="rec-description">Descrição</FieldLabel>
                            <Input
                                id="rec-description"
                                placeholder={type === "expense" ? "Ex: Aluguel" : "Ex: Salário"}
                                autoFocus
                                aria-invalid={!!errors.description}
                                {...form.register("description")}
                            />
                            <FieldError errors={[errors.description]} />
                        </Field>
                        <Field data-invalid={!!errors.amountCents}>
                            <FieldLabel htmlFor="rec-amount">Valor</FieldLabel>
                            <Controller
                                control={form.control}
                                name="amountCents"
                                render={({ field }) => (
                                    <MoneyInput id="rec-amount" value={field.value} onChange={field.onChange} invalid={!!errors.amountCents} />
                                )}
                            />
                            <FieldError errors={[errors.amountCents]} />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="rec-frequency">Repete</FieldLabel>
                            <Controller
                                control={form.control}
                                name="frequency"
                                render={({ field }) => (
                                    <OptionSelect
                                        id="rec-frequency"
                                        options={frequencyOptions}
                                        value={field.value}
                                        onChange={(value) => value && field.onChange(value)}
                                    />
                                )}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="rec-category">Categoria</FieldLabel>
                            <Controller
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <OptionSelect
                                        id="rec-category"
                                        options={categoryOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        emptyLabel="Sem categoria"
                                    />
                                )}
                            />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={!!errors.startDate}>
                            <FieldLabel htmlFor="rec-start">Primeiro vencimento</FieldLabel>
                            <Controller
                                control={form.control}
                                name="startDate"
                                render={({ field }) => <DatePicker id="rec-start" value={field.value} onChange={field.onChange} invalid={!!errors.startDate} />}
                            />
                            <FieldError errors={[errors.startDate]} />
                        </Field>
                        <Field data-invalid={!!errors.endDate}>
                            <FieldLabel htmlFor="rec-end">Termina em (opcional)</FieldLabel>
                            <Controller
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <DatePicker id="rec-end" value={field.value} onChange={field.onChange} invalid={!!errors.endDate} placeholder="Sem data final" clearable />
                                )}
                            />
                            <FieldError errors={[errors.endDate]} />
                        </Field>
                    </div>
                    <FieldDescription>
                        Data inicial no passado gera os lançamentos atrasados de uma vez, pra você não perder o histórico.
                    </FieldDescription>

                    {type === "expense" ? (
                        <Controller
                            control={form.control}
                            name="target"
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel>Cobrado em</FieldLabel>
                                    <Tabs value={field.value} onValueChange={field.onChange}>
                                        <TabsList className="w-full">
                                            <TabsTrigger value="account">Conta / boleto</TabsTrigger>
                                            <TabsTrigger value="card" disabled={creditCards.length === 0}>
                                                Cartão de crédito
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </Field>
                            )}
                        />
                    ) : null}

                    {target === "account" ? (
                        <>
                            <Field data-invalid={!!errors.accountId}>
                                <FieldLabel htmlFor="rec-account">Conta</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="accountId"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="rec-account"
                                            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                                            value={field.value}
                                            onChange={field.onChange}
                                            invalid={!!errors.accountId}
                                        />
                                    )}
                                />
                                <FieldError errors={[errors.accountId]} />
                            </Field>
                            <Controller
                                control={form.control}
                                name="autoPay"
                                render={({ field }) => (
                                    <Field orientation="horizontal">
                                        <Switch id="rec-autopay" checked={field.value} onCheckedChange={field.onChange} />
                                        <FieldLabel htmlFor="rec-autopay" className="font-normal">
                                            {type === "expense"
                                                ? "Débito automático (marca como pago no vencimento)"
                                                : "Cai automaticamente (marca como recebido na data)"}
                                        </FieldLabel>
                                    </Field>
                                )}
                            />
                        </>
                    ) : (
                        <Field data-invalid={!!errors.accountId}>
                            <FieldLabel htmlFor="rec-card">Cartão</FieldLabel>
                            <Controller
                                control={form.control}
                                name="creditCardId"
                                render={({ field }) => (
                                    <OptionSelect
                                        id="rec-card"
                                        options={creditCards.map((c) => ({ value: c.id, label: c.name }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            <FieldDescription>Cada cobrança entra na fatura do mês correspondente.</FieldDescription>
                        </Field>
                    )}
                </FieldGroup>
            </DialogBody>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    Criar recorrência
                </Button>
            </DialogFooter>
        </form>
    )
}

function EditForm({
    recurring,
    onCancel,
    onSubmit,
}: {
    recurring: RecurringTransaction
    onCancel: () => void
    onSubmit: (form: RecurringUpdateForm) => Promise<boolean>
}) {
    const { categories } = useCategories()
    const form = useForm<RecurringUpdateForm>({
        resolver: zodResolver(recurringUpdateSchema),
        defaultValues: {
            description: recurring.description,
            amountCents: recurring.amountCents,
            categoryId: recurring.categoryId,
            endDate: recurring.endDate ?? "",
            autoPay: recurring.autoPay,
        },
    })
    const { errors, isSubmitting } = form.formState

    const categoryOptions = categories
        .filter((category) => category.type === recurring.type)
        .map((category) => ({ value: category.id, label: category.name, color: category.color }))

    const submit = async (values: RecurringUpdateForm) => {
        if (await onSubmit(values)) onCancel()
    }

    return (
        <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
            <DialogHeader>
                <DialogTitle>Editar recorrência</DialogTitle>
                <DialogDescription>
                    As mudanças valem pras próximas cobranças; o que já foi lançado continua igual.
                </DialogDescription>
            </DialogHeader>
            <DialogBody>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
                        <Field data-invalid={!!errors.description}>
                            <FieldLabel htmlFor="rec-edit-description">Descrição</FieldLabel>
                            <Input id="rec-edit-description" {...form.register("description")} />
                            <FieldError errors={[errors.description]} />
                        </Field>
                        <Field data-invalid={!!errors.amountCents}>
                            <FieldLabel htmlFor="rec-edit-amount">Valor</FieldLabel>
                            <Controller
                                control={form.control}
                                name="amountCents"
                                render={({ field }) => (
                                    <MoneyInput id="rec-edit-amount" value={field.value} onChange={field.onChange} />
                                )}
                            />
                            <FieldError errors={[errors.amountCents]} />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="rec-edit-category">Categoria</FieldLabel>
                            <Controller
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <OptionSelect
                                        id="rec-edit-category"
                                        options={categoryOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        emptyLabel="Sem categoria"
                                    />
                                )}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="rec-edit-end">Termina em (opcional)</FieldLabel>
                            <Controller
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <DatePicker id="rec-edit-end" value={field.value} onChange={field.onChange} placeholder="Sem data final" clearable />
                                )}
                            />
                        </Field>
                    </div>
                    {recurring.accountId ? (
                        <Controller
                            control={form.control}
                            name="autoPay"
                            render={({ field }) => (
                                <Field orientation="horizontal">
                                    <Switch id="rec-edit-autopay" checked={field.value} onCheckedChange={field.onChange} />
                                    <FieldLabel htmlFor="rec-edit-autopay" className="font-normal">
                                        Débito automático
                                    </FieldLabel>
                                </Field>
                            )}
                        />
                    ) : null}
                </FieldGroup>
            </DialogBody>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    Salvar alterações
                </Button>
            </DialogFooter>
        </form>
    )
}
