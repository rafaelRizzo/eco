// Cartões de crédito: tipos, schema do formulário e CRUD (limite usado/disponível vem do backend).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { api } from "@/lib/api"
import { invalidateMoney, withToast } from "@/lib/mutation"

export type CreditCard = {
    id: string
    name: string
    limitCents: number
    usedLimitCents: number
    availableLimitCents: number
    closingDay: number
    dueDay: number
    paymentAccountId: string | null
    createdAt: string
    updatedAt: string
}

const day = () => z.number({ error: "Informe o dia" }).int().min(1, "Entre 1 e 31").max(31, "Entre 1 e 31")

export const creditCardFormSchema = z.object({
    name: z.string().trim().min(1, "Dê um nome ao cartão").max(80),
    limitCents: z.number().int().min(0),
    closingDay: day(),
    dueDay: day(),
    paymentAccountId: z.string().nullable(),
})

export type CreditCardForm = z.infer<typeof creditCardFormSchema>

export function useCreditCards() {
    const queryClient = useQueryClient()
    const { data: creditCards = [], isLoading: loading } = useQuery({
        queryKey: ["credit-cards"],
        queryFn: async () => (await api.get<{ creditCards: CreditCard[] }>("/credit-cards")).data.creditCards,
    })

    const createMutation = useMutation({
        mutationFn: async (form: CreditCardForm) =>
            (await api.post<{ creditCard: CreditCard }>("/credit-cards", form)).data.creditCard,
        onSuccess: () => invalidateMoney(queryClient),
    })
    const updateMutation = useMutation({
        mutationFn: async ({ id, form }: { id: string; form: CreditCardForm }) =>
            (await api.patch<{ creditCard: CreditCard }>(`/credit-cards/${id}`, form)).data.creditCard,
        onSuccess: () => invalidateMoney(queryClient),
    })
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/credit-cards/${id}`),
        onSuccess: () => invalidateMoney(queryClient),
    })

    const createCreditCard = (form: CreditCardForm) =>
        withToast(() => createMutation.mutateAsync(form), {
            loading: "Criando cartão...",
            success: "Cartão criado",
            error: "Não foi possível criar o cartão",
        })

    const updateCreditCard = async (id: string, form: CreditCardForm) =>
        !!(await withToast(() => updateMutation.mutateAsync({ id, form }), {
            loading: "Salvando cartão...",
            success: "Cartão atualizado",
            error: "Não foi possível salvar o cartão",
        }))

    const deleteCreditCard = async (id: string) =>
        !!(await withToast(() => deleteMutation.mutateAsync(id), {
            loading: "Excluindo cartão...",
            success: "Cartão excluído",
            error: "Não foi possível excluir o cartão",
        }))

    return { creditCards, loading, createCreditCard, updateCreditCard, deleteCreditCard }
}

export function useCreditCard(id: string) {
    const { data: creditCard = null, isLoading: loading } = useQuery({
        queryKey: ["credit-cards", id],
        queryFn: async () => (await api.get<{ creditCard: CreditCard }>(`/credit-cards/${id}`)).data.creditCard,
    })
    return { creditCard, loading }
}
