// Dialog de lançamento: criar (receita/despesa, em conta ou cartão, à vista ou parcelado) ou editar um existente.
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "motion/react"
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
import { Textarea } from "@/components/ui/textarea"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useCreditCards } from "@/hooks/use-credit-cards"
import {
    type Transaction,
    type TransactionForm,
    type TransactionUpdateForm,
    transactionFormSchema,
    transactionUpdateSchema,
} from "@/hooks/use-transactions"
import { formatCents, todayKey } from "@/lib/format"

type Props =
    | {
          open: boolean
          onOpenChange: (open: boolean) => void
          transaction: null
          onCreate: (form: TransactionForm) => Promise<boolean>
          onUpdate?: never
      }
    | {
          open: boolean
          onOpenChange: (open: boolean) => void
          transaction: Transaction
          onCreate?: never
          onUpdate: (form: TransactionUpdateForm) => Promise<boolean>
      }

export function TransactionFormDialog(props: Props) {
    const { open, onOpenChange, transaction } = props
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                {transaction ? (
                    <EditForm transaction={transaction} onCancel={() => onOpenChange(false)} onSubmit={props.onUpdate!} />
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
    onSubmit: (form: TransactionForm) => Promise<boolean>
}) {
    const { accounts } = useAccounts()
    const { creditCards } = useCreditCards()
    const { categories } = useCategories()

    const defaults = useMemo<TransactionForm>(
        () => ({
            type: "expense",
            description: "",
            amountCents: 0,
            date: todayKey(),
            categoryId: null,
            target: "account",
            accountId: accounts[0]?.id ?? null,
            creditCardId: creditCards[0]?.id ?? null,
            installments: 1,
            paid: true,
            notes: "",
        }),
        [accounts, creditCards],
    )

    const form = useForm<TransactionForm>({ resolver: zodResolver(transactionFormSchema), defaultValues: defaults })
    const { errors, isSubmitting } = form.formState
    const [type, target, amountCents, installments, date] = useWatch({
        control: form.control,
        name: ["type", "target", "amountCents", "installments", "date"],
    })

    useEffect(() => {
        if (open) form.reset(defaults)
    }, [open, defaults, form])

    const categoryOptions = categories
        .filter((category) => category.type === type)
        .map((category) => ({ value: category.id, label: category.name, color: category.color }))

    const submit = async (values: TransactionForm) => {
        if (await onSubmit(values)) onCancel()
    }

    const isFuture = date > todayKey()

    return (
        <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
            <DialogHeader>
                <DialogTitle>Novo lançamento</DialogTitle>
                <DialogDescription>Registre um gasto, uma compra no cartão ou uma entrada de dinheiro.</DialogDescription>
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
                                    // Receita não entra no cartão.
                                    if (value === "income") form.setValue("target", "account")
                                }}
                            >
                                <TabsList className="w-full">
                                    <TabsTrigger value="expense">Despesa</TabsTrigger>
                                    <TabsTrigger value="income">Receita</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                    />

                    <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
                        <Field data-invalid={!!errors.description}>
                            <FieldLabel htmlFor="tx-description">Descrição</FieldLabel>
                            <Input
                                id="tx-description"
                                placeholder={type === "expense" ? "Ex: Mercado do mês" : "Ex: Salário"}
                                autoFocus
                                aria-invalid={!!errors.description}
                                {...form.register("description")}
                            />
                            <FieldError errors={[errors.description]} />
                        </Field>
                        <Field data-invalid={!!errors.amountCents}>
                            <FieldLabel htmlFor="tx-amount">{installments > 1 ? "Valor total" : "Valor"}</FieldLabel>
                            <Controller
                                control={form.control}
                                name="amountCents"
                                render={({ field }) => (
                                    <MoneyInput
                                        id="tx-amount"
                                        value={field.value}
                                        onChange={field.onChange}
                                        invalid={!!errors.amountCents}
                                    />
                                )}
                            />
                            <FieldError errors={[errors.amountCents]} />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={!!errors.date}>
                            <FieldLabel htmlFor="tx-date">{type === "expense" ? "Data / vencimento" : "Data"}</FieldLabel>
                            <Controller
                                control={form.control}
                                name="date"
                                render={({ field }) => <DatePicker id="tx-date" value={field.value} onChange={field.onChange} invalid={!!errors.date} />}
                            />
                            <FieldError errors={[errors.date]} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="tx-category">Categoria</FieldLabel>
                            <Controller
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <OptionSelect
                                        id="tx-category"
                                        options={categoryOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        emptyLabel="Sem categoria"
                                    />
                                )}
                            />
                        </Field>
                    </div>

                    {type === "expense" ? (
                        <Controller
                            control={form.control}
                            name="target"
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel>Pago com</FieldLabel>
                                    <Tabs value={field.value} onValueChange={field.onChange}>
                                        <TabsList className="w-full">
                                            <TabsTrigger value="account">Conta / dinheiro</TabsTrigger>
                                            <TabsTrigger value="card" disabled={creditCards.length === 0}>
                                                Cartão de crédito
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </Field>
                            )}
                        />
                    ) : null}

                    <AnimatePresence mode="wait" initial={false}>
                        {target === "account" ? (
                            <motion.div
                                key="account"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.16 }}
                                className="grid gap-4"
                            >
                                <Field data-invalid={!!errors.accountId}>
                                    <FieldLabel htmlFor="tx-account">Conta</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="accountId"
                                        render={({ field }) => (
                                            <OptionSelect
                                                id="tx-account"
                                                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder={accounts.length ? "Escolha a conta" : "Cadastre uma conta primeiro"}
                                                invalid={!!errors.accountId}
                                            />
                                        )}
                                    />
                                    <FieldError errors={[errors.accountId]} />
                                </Field>
                                <Controller
                                    control={form.control}
                                    name="paid"
                                    render={({ field }) => (
                                        <Field orientation="horizontal">
                                            <Switch id="tx-paid" checked={field.value} onCheckedChange={field.onChange} />
                                            <FieldLabel htmlFor="tx-paid" className="font-normal">
                                                {type === "expense" ? "Já foi pago" : "Já foi recebido"}
                                                {isFuture && field.value ? (
                                                    <span className="text-due text-xs">(data no futuro)</span>
                                                ) : null}
                                            </FieldLabel>
                                        </Field>
                                    )}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="card"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.16 }}
                                className="grid gap-4 sm:grid-cols-[1fr_8rem]"
                            >
                                <Field data-invalid={!!errors.accountId}>
                                    <FieldLabel htmlFor="tx-card">Cartão</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name="creditCardId"
                                        render={({ field }) => (
                                            <OptionSelect
                                                id="tx-card"
                                                options={creditCards.map((c) => ({ value: c.id, label: c.name }))}
                                                value={field.value}
                                                onChange={field.onChange}
                                                invalid={!!errors.accountId}
                                            />
                                        )}
                                    />
                                    <FieldError errors={[errors.accountId]} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="tx-installments">Parcelas</FieldLabel>
                                    <Input
                                        id="tx-installments"
                                        type="number"
                                        min={1}
                                        max={48}
                                        {...form.register("installments", { valueAsNumber: true })}
                                    />
                                </Field>
                                {installments > 1 && amountCents > 0 ? (
                                    <FieldDescription className="sm:col-span-2">
                                        {installments}x de{" "}
                                        <span className="money text-foreground">
                                            {formatCents(Math.floor(amountCents / installments))}
                                        </span>
                                        , uma em cada fatura a partir da compra.
                                    </FieldDescription>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Field>
                        <FieldLabel htmlFor="tx-notes">Observação (opcional)</FieldLabel>
                        <Textarea id="tx-notes" rows={2} {...form.register("notes")} />
                    </Field>
                </FieldGroup>
            </DialogBody>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {type === "expense" ? "Lançar despesa" : "Lançar receita"}
                </Button>
            </DialogFooter>
        </form>
    )
}

function EditForm({
    transaction,
    onCancel,
    onSubmit,
}: {
    transaction: Transaction
    onCancel: () => void
    onSubmit: (form: TransactionUpdateForm) => Promise<boolean>
}) {
    const { categories } = useCategories()
    const form = useForm<TransactionUpdateForm>({
        resolver: zodResolver(transactionUpdateSchema),
        defaultValues: {
            description: transaction.description,
            amountCents: transaction.amountCents,
            date: transaction.date,
            categoryId: transaction.categoryId,
            notes: transaction.notes ?? "",
        },
    })
    const { errors, isSubmitting } = form.formState

    const categoryOptions = categories
        .filter((category) => category.type === transaction.type)
        .map((category) => ({ value: category.id, label: category.name, color: category.color }))

    const submit = async (values: TransactionUpdateForm) => {
        if (await onSubmit(values)) onCancel()
    }

    return (
        <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
            <DialogHeader>
                <DialogTitle>Editar lançamento</DialogTitle>
                <DialogDescription>
                    {transaction.installmentTotal
                        ? `Parcela ${transaction.installmentNumber}/${transaction.installmentTotal}: a mudança vale só pra esta parcela.`
                        : "Conta, cartão e tipo não mudam. Pra isso, exclua e lance de novo."}
                </DialogDescription>
            </DialogHeader>
            <DialogBody>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
                        <Field data-invalid={!!errors.description}>
                            <FieldLabel htmlFor="edit-description">Descrição</FieldLabel>
                            <Input id="edit-description" aria-invalid={!!errors.description} {...form.register("description")} />
                            <FieldError errors={[errors.description]} />
                        </Field>
                        <Field data-invalid={!!errors.amountCents}>
                            <FieldLabel htmlFor="edit-amount">Valor</FieldLabel>
                            <Controller
                                control={form.control}
                                name="amountCents"
                                render={({ field }) => (
                                    <MoneyInput id="edit-amount" value={field.value} onChange={field.onChange} />
                                )}
                            />
                            <FieldError errors={[errors.amountCents]} />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={!!errors.date}>
                            <FieldLabel htmlFor="edit-date">Data</FieldLabel>
                            <Controller
                                control={form.control}
                                name="date"
                                render={({ field }) => <DatePicker id="edit-date" value={field.value} onChange={field.onChange} invalid={!!errors.date} />}
                            />
                            <FieldError errors={[errors.date]} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="edit-category">Categoria</FieldLabel>
                            <Controller
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <OptionSelect
                                        id="edit-category"
                                        options={categoryOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        emptyLabel="Sem categoria"
                                    />
                                )}
                            />
                        </Field>
                    </div>
                    <Field>
                        <FieldLabel htmlFor="edit-notes">Observação (opcional)</FieldLabel>
                        <Textarea id="edit-notes" rows={2} {...form.register("notes")} />
                    </Field>
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
