// Lançamentos: tipos, schema do formulário (conta ou cartão, parcelado) e CRUD + marcar como pago.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { z } from "zod"
import { api } from "@/lib/api"
import { invalidateMoney, withToast } from "@/lib/mutation"
import type { TransactionType } from "./use-categories"

export type TransactionStatus = "pending" | "paid" | "overdue"

export const transactionStatusLabels: Record<TransactionStatus, string> = {
    pending: "Pendente",
    paid: "Pago",
    overdue: "Atrasado",
}

export type Transaction = {
    id: string
    type: TransactionType
    status: TransactionStatus
    description: string
    amountCents: number
    date: string
    paidAt: string | null
    categoryId: string | null
    accountId: string | null
    creditCardId: string | null
    invoiceId: string | null
    recurringTransactionId: string | null
    installmentGroupId: string | null
    installmentNumber: number | null
    installmentTotal: number | null
    notes: string | null
    createdAt: string
    updatedAt: string
}

export type TransactionFilters = {
    month?: string
    type?: TransactionType
    status?: TransactionStatus
    accountId?: string
    creditCardId?: string
    categoryId?: string
}

// "target" escolhe entre conta e cartão; vira accountId OU creditCardId no envio.
export const transactionFormSchema = z
    .object({
        type: z.enum(["income", "expense"]),
        description: z.string().trim().min(1, "Descreva o lançamento").max(160),
        amountCents: z.number().int().positive("Informe um valor maior que zero"),
        date: z.iso.date("Informe a data"),
        categoryId: z.string().nullable(),
        target: z.enum(["account", "card"]),
        accountId: z.string().nullable(),
        creditCardId: z.string().nullable(),
        installments: z.number().int().min(1).max(48),
        paid: z.boolean(),
        notes: z.string().max(500),
    })
    .refine((form) => (form.target === "account" ? !!form.accountId : !!form.creditCardId), {
        message: "Escolha onde lançar",
        path: ["accountId"],
    })

export type TransactionForm = z.infer<typeof transactionFormSchema>

export const transactionUpdateSchema = z.object({
    description: z.string().trim().min(1, "Descreva o lançamento").max(160),
    amountCents: z.number().int().positive("Informe um valor maior que zero"),
    date: z.iso.date("Informe a data"),
    categoryId: z.string().nullable(),
    notes: z.string().max(500),
})

export type TransactionUpdateForm = z.infer<typeof transactionUpdateSchema>

const toPayload = (form: TransactionForm) => ({
    type: form.type,
    description: form.description,
    amountCents: form.amountCents,
    date: form.date,
    categoryId: form.categoryId,
    notes: form.notes || null,
    ...(form.target === "account"
        ? { accountId: form.accountId, status: form.paid ? "paid" : "pending" }
        : { creditCardId: form.creditCardId, installments: form.installments }),
})

const cleanFilters = (filters: TransactionFilters) =>
    Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""))

export function useTransactions(filters: TransactionFilters) {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState("")
    const params = cleanFilters(filters)

    const { data: transactions = [], isLoading: loading } = useQuery({
        queryKey: ["transactions", params],
        queryFn: async () => (await api.get<{ transactions: Transaction[] }>("/transactions", { params })).data.transactions,
        // Troca de mês mantém a lista anterior na tela até a nova chegar (sem piscar skeleton).
        placeholderData: keepPreviousData,
    })

    const invalidate = () => invalidateMoney(queryClient)

    const createMutation = useMutation({
        mutationFn: async (form: TransactionForm) =>
            (await api.post<{ transactions: Transaction[] }>("/transactions", toPayload(form))).data.transactions,
        onSuccess: invalidate,
    })
    const updateMutation = useMutation({
        mutationFn: async ({ id, form }: { id: string; form: TransactionUpdateForm }) =>
            (await api.patch<{ transaction: Transaction }>(`/transactions/${id}`, { ...form, notes: form.notes || null }))
                .data.transaction,
        onSuccess: invalidate,
    })
    const payMutation = useMutation({
        mutationFn: async (id: string) => (await api.post(`/transactions/${id}/pay`, {})).data,
        onSuccess: invalidate,
    })
    const deleteMutation = useMutation({
        mutationFn: async ({ id, allInstallments }: { id: string; allInstallments: boolean }) =>
            api.delete(`/transactions/${id}`, { params: { scope: allInstallments ? "installments" : "single" } }),
        onSuccess: invalidate,
    })

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()
        return term ? transactions.filter((t) => t.description.toLowerCase().includes(term)) : transactions
    }, [transactions, search])

    const totals = useMemo(
        () =>
            filtered.reduce(
                (acc, t) => {
                    if (t.type === "income") acc.incomeCents += t.amountCents
                    else acc.expenseCents += t.amountCents
                    return acc
                },
                { incomeCents: 0, expenseCents: 0 },
            ),
        [filtered],
    )

    const createTransaction = (form: TransactionForm) =>
        withToast(() => createMutation.mutateAsync(form), {
            loading: "Lançando...",
            success: form.installments > 1 && form.target === "card" ? `${form.installments} parcelas lançadas` : "Lançamento criado",
            error: "Não foi possível lançar",
        })

    const updateTransaction = async (id: string, form: TransactionUpdateForm) =>
        !!(await withToast(() => updateMutation.mutateAsync({ id, form }), {
            loading: "Salvando...",
            success: "Lançamento atualizado",
            error: "Não foi possível salvar",
        }))

    const payTransaction = async (id: string) =>
        !!(await withToast(() => payMutation.mutateAsync(id), {
            loading: "Marcando como pago...",
            success: "Marcado como pago",
            error: "Não foi possível marcar como pago",
        }))

    const deleteTransaction = async (id: string, allInstallments = false) =>
        !!(await withToast(() => deleteMutation.mutateAsync({ id, allInstallments }), {
            loading: "Excluindo...",
            success: allInstallments ? "Parcelas excluídas" : "Lançamento excluído",
            error: "Não foi possível excluir",
        }))

    return {
        transactions: filtered,
        totals,
        loading,
        search,
        setSearch,
        createTransaction,
        updateTransaction,
        payTransaction,
        deleteTransaction,
    }
}
