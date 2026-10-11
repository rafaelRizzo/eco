// Contas (corrente, poupança, dinheiro...): tipos, schema do formulário e CRUD com saldo calculado no backend.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { api } from "@/lib/api"
import { invalidateMoney, withToast } from "@/lib/mutation"

export type AccountType = "checking" | "savings" | "cash" | "investment" | "other"

export const accountTypeLabels: Record<AccountType, string> = {
    checking: "Conta corrente",
    savings: "Poupança",
    cash: "Dinheiro",
    investment: "Investimento",
    other: "Outra",
}

export type Account = {
    id: string
    name: string
    type: AccountType
    initialBalanceCents: number
    balanceCents: number
    createdAt: string
    updatedAt: string
}

export const accountFormSchema = z.object({
    name: z.string().trim().min(1, "Dê um nome à conta").max(80),
    type: z.enum(["checking", "savings", "cash", "investment", "other"]),
    initialBalanceCents: z.number().int(),
})

export type AccountForm = z.infer<typeof accountFormSchema>

export function useAccounts() {
    const queryClient = useQueryClient()
    const { data: accounts = [], isLoading: loading } = useQuery({
        queryKey: ["accounts"],
        queryFn: async () => (await api.get<{ accounts: Account[] }>("/accounts")).data.accounts,
    })

    const createMutation = useMutation({
        mutationFn: async (form: AccountForm) => (await api.post<{ account: Account }>("/accounts", form)).data.account,
        onSuccess: () => invalidateMoney(queryClient),
    })
    const updateMutation = useMutation({
        mutationFn: async ({ id, form }: { id: string; form: AccountForm }) =>
            (await api.patch<{ account: Account }>(`/accounts/${id}`, form)).data.account,
        onSuccess: () => invalidateMoney(queryClient),
    })
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/accounts/${id}`),
        onSuccess: () => invalidateMoney(queryClient),
    })

    const totalBalanceCents = accounts.reduce((sum, account) => sum + account.balanceCents, 0)

    const createAccount = (form: AccountForm) =>
        withToast(() => createMutation.mutateAsync(form), {
            loading: "Criando conta...",
            success: "Conta criada",
            error: "Não foi possível criar a conta",
        })

    const updateAccount = async (id: string, form: AccountForm) =>
        !!(await withToast(() => updateMutation.mutateAsync({ id, form }), {
            loading: "Salvando conta...",
            success: "Conta atualizada",
            error: "Não foi possível salvar a conta",
        }))

    const deleteAccount = async (id: string) =>
        !!(await withToast(() => deleteMutation.mutateAsync(id), {
            loading: "Excluindo conta...",
            success: "Conta excluída",
            error: "Não foi possível excluir a conta",
        }))

    return { accounts, totalBalanceCents, loading, createAccount, updateAccount, deleteAccount }
}
