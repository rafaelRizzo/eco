// Recorrências (mensalidades, assinaturas, salário): tipos, schema do formulário e CRUD + pausar/retomar.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { api } from "@/lib/api"
import { invalidateMoney, withToast } from "@/lib/mutation"
import type { TransactionType } from "./use-categories"

export type Frequency = "weekly" | "monthly" | "yearly"

export const frequencyLabels: Record<Frequency, string> = { weekly: "Semanal", monthly: "Mensal", yearly: "Anual" }

export type RecurringTransaction = {
    id: string
    description: string
    amountCents: number
    type: TransactionType
    frequency: Frequency
    categoryId: string | null
    accountId: string | null
    creditCardId: string | null
    startDate: string
    endDate: string | null
    nextRunDate: string
    lastRunDate: string | null
    autoPay: boolean
    active: boolean
    createdAt: string
    updatedAt: string
}

export const recurringFormSchema = z
    .object({
        description: z.string().trim().min(1, "Descreva a recorrência").max(160),
        amountCents: z.number().int().positive("Informe um valor maior que zero"),
        type: z.enum(["income", "expense"]),
        frequency: z.enum(["weekly", "monthly", "yearly"]),
        categoryId: z.string().nullable(),
        target: z.enum(["account", "card"]),
        accountId: z.string().nullable(),
        creditCardId: z.string().nullable(),
        startDate: z.iso.date("Informe o primeiro vencimento"),
        endDate: z.string(),
        autoPay: z.boolean(),
    })
    .refine((form) => (form.target === "account" ? !!form.accountId : !!form.creditCardId), {
        message: "Escolha onde lançar",
        path: ["accountId"],
    })
    .refine((form) => !form.endDate || form.endDate >= form.startDate, {
        message: "O fim precisa ser depois do início",
        path: ["endDate"],
    })

export type RecurringForm = z.infer<typeof recurringFormSchema>

export const recurringUpdateSchema = z.object({
    description: z.string().trim().min(1, "Descreva a recorrência").max(160),
    amountCents: z.number().int().positive("Informe um valor maior que zero"),
    categoryId: z.string().nullable(),
    endDate: z.string(),
    autoPay: z.boolean(),
})

export type RecurringUpdateForm = z.infer<typeof recurringUpdateSchema>

const toPayload = (form: RecurringForm) => ({
    description: form.description,
    amountCents: form.amountCents,
    type: form.type,
    frequency: form.frequency,
    categoryId: form.categoryId,
    startDate: form.startDate,
    endDate: form.endDate || null,
    autoPay: form.target === "account" ? form.autoPay : false,
    ...(form.target === "account" ? { accountId: form.accountId } : { creditCardId: form.creditCardId }),
})

export function useRecurringTransactions() {
    const queryClient = useQueryClient()
    const { data: recurringTransactions = [], isLoading: loading } = useQuery({
        queryKey: ["recurring-transactions"],
        queryFn: async () =>
            (await api.get<{ recurringTransactions: RecurringTransaction[] }>("/recurring-transactions")).data
                .recurringTransactions,
    })

    const invalidate = () => invalidateMoney(queryClient)

    const createMutation = useMutation({
        mutationFn: async (form: RecurringForm) =>
            (await api.post<{ recurringTransaction: RecurringTransaction }>("/recurring-transactions", toPayload(form)))
                .data.recurringTransaction,
        onSuccess: invalidate,
    })
    const updateMutation = useMutation({
        mutationFn: async ({ id, changes }: { id: string; changes: Record<string, unknown> }) =>
            (await api.patch<{ recurringTransaction: RecurringTransaction }>(`/recurring-transactions/${id}`, changes))
                .data.recurringTransaction,
        onSuccess: invalidate,
    })
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/recurring-transactions/${id}`),
        onSuccess: invalidate,
    })

    const monthlyCommitmentCents = recurringTransactions
        .filter((r) => r.active && r.type === "expense")
        .reduce((sum, r) => {
            if (r.frequency === "weekly") return sum + Math.round((r.amountCents * 52) / 12)
            if (r.frequency === "yearly") return sum + Math.round(r.amountCents / 12)
            return sum + r.amountCents
        }, 0)

    const createRecurring = (form: RecurringForm) =>
        withToast(() => createMutation.mutateAsync(form), {
            loading: "Criando recorrência...",
            success: "Recorrência criada",
            error: "Não foi possível criar a recorrência",
        })

    const updateRecurring = async (id: string, form: RecurringUpdateForm) =>
        !!(await withToast(
            () => updateMutation.mutateAsync({ id, changes: { ...form, endDate: form.endDate || null } }),
            { loading: "Salvando...", success: "Recorrência atualizada", error: "Não foi possível salvar" },
        ))

    const setActive = async (id: string, active: boolean) =>
        !!(await withToast(() => updateMutation.mutateAsync({ id, changes: { active } }), {
            loading: active ? "Retomando..." : "Pausando...",
            success: active ? "Recorrência retomada" : "Recorrência pausada",
            error: "Não foi possível alterar a recorrência",
        }))

    const deleteRecurring = async (id: string) =>
        !!(await withToast(() => deleteMutation.mutateAsync(id), {
            loading: "Excluindo...",
            success: "Recorrência excluída",
            error: "Não foi possível excluir",
        }))

    return {
        recurringTransactions,
        monthlyCommitmentCents,
        loading,
        createRecurring,
        updateRecurring,
        setActive,
        deleteRecurring,
    }
}
