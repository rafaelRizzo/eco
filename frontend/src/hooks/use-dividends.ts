// Proventos: lista do mês (lançados + estimados de FIIs), resumo dos próximos meses e CRUD.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { api } from "@/lib/api"
import { invalidateInvestments, invalidateMoney, withToast } from "@/lib/mutation"
import { parseQuantity } from "./use-asset-trades"

export type DividendKind = "dividend" | "jcp" | "yield" | "other"

export const dividendKindLabels: Record<DividendKind, string> = {
    dividend: "Dividendo",
    jcp: "JCP",
    yield: "Rendimento",
    other: "Outro",
}

export type DividendStatus = "received" | "pending" | "estimated"

export const dividendStatusLabels: Record<DividendStatus, string> = {
    received: "Recebido",
    pending: "A receber",
    estimated: "Estimado",
}

export type Dividend = {
    id: string
    assetId: string
    ticker: string
    assetName: string
    kind: DividendKind
    quantity: number
    // Valor por cota em reais (até 6 casas).
    amountPerUnit: number
    totalCents: number
    comDate: string | null
    payDate: string
    // Receita criada na conta ao confirmar o recebimento; nulo = ainda não creditado.
    transactionId: string | null
    status: DividendStatus
}

// due*: estimados com data vencida aguardando o usuário confirmar o recebimento.
export type DividendTotals = {
    totalCents: number
    receivedCents: number
    pendingCents: number
    estimatedCents: number
    dueCents: number
    dueCount: number
}
export type MonthTotals = DividendTotals & { month: string }

const emptyTotals: DividendTotals = {
    totalCents: 0,
    receivedCents: 0,
    pendingCents: 0,
    estimatedCents: 0,
    dueCents: 0,
    dueCount: 0,
}

// Valor por cota pode ser menor que R$ 0,01 (ações): mostra de 2 a 6 casas.
export const formatPerUnit = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value)

export const parsePerUnit = (value: string) => Number(value.trim().replace(",", "."))

export const dividendFormSchema = z.object({
    assetId: z.string().min(1, "Escolha o ativo"),
    kind: z.enum(["dividend", "jcp", "yield", "other"]),
    // Vazio = usa a posição atual do ativo.
    quantity: z
        .string()
        .trim()
        .refine((value) => value === "" || /^\d+([.,]\d{1,8})?$/.test(value), "Use um número com até 8 casas decimais")
        .refine((value) => value === "" || parseQuantity(value) > 0, "Informe uma quantidade maior que zero"),
    // Valor por cota em reais, texto (aceita vírgula, até 6 casas).
    amountPerUnit: z
        .string()
        .trim()
        .regex(/^\d+([.,]\d{1,6})?$/, "Use um número com até 6 casas decimais")
        .refine((value) => parsePerUnit(value) > 0, "Informe um valor maior que zero"),
    comDate: z.string(),
    payDate: z.iso.date("Informe a data de pagamento"),
    // Conta que recebeu ("" = não creditar em conta).
    accountId: z.string(),
})

export type DividendForm = z.infer<typeof dividendFormSchema>

const toPayload = (form: DividendForm) => ({
    ...form,
    amountPerUnit: parsePerUnit(form.amountPerUnit),
    quantity: form.quantity ? parseQuantity(form.quantity) : undefined,
    comDate: form.comDate || null,
    accountId: form.accountId || undefined,
})

export function useUpcomingDividends(months = 3) {
    const { data: upcoming = [], isLoading: loading } = useQuery({
        queryKey: ["dividends", "upcoming", months],
        queryFn: async () =>
            (await api.get<{ months: MonthTotals[] }>("/dividends/upcoming", { params: { months } })).data.months,
    })
    return { upcoming, loading }
}

// Proventos do mês atual aguardando confirmação (alimenta aviso na carteira, aba e painel).
export function useDividendsDue() {
    const { upcoming } = useUpcomingDividends(3)
    const current = upcoming[0]
    return { dueCount: current?.dueCount ?? 0, dueCents: current?.dueCents ?? 0 }
}

export function useDividends(month: string) {
    const queryClient = useQueryClient()
    const { data, isLoading: loading } = useQuery({
        queryKey: ["dividends", "month", month],
        queryFn: async () =>
            (await api.get<{ dividends: Dividend[]; totals: DividendTotals }>("/dividends", { params: { month } })).data,
        placeholderData: keepPreviousData,
    })

    const createMutation = useMutation({
        mutationFn: async (form: DividendForm) =>
            (await api.post<{ dividend: Dividend }>("/dividends", toPayload(form))).data.dividend,
        onSuccess: () => Promise.all([invalidateInvestments(queryClient), invalidateMoney(queryClient)]),
    })
    const updateMutation = useMutation({
        mutationFn: async ({ id, form }: { id: string; form: DividendForm }) =>
            (await api.patch<{ dividend: Dividend }>(`/dividends/${id}`, toPayload(form))).data.dividend,
        onSuccess: () => Promise.all([invalidateInvestments(queryClient), invalidateMoney(queryClient)]),
    })
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/dividends/${id}`),
        onSuccess: () => Promise.all([invalidateInvestments(queryClient), invalidateMoney(queryClient)]),
    })

    const createDividend = async (form: DividendForm) =>
        !!(await withToast(() => createMutation.mutateAsync(form), {
            loading: "Registrando provento...",
            success: "Provento registrado",
            error: "Não foi possível registrar o provento",
        }))

    const updateDividend = async (id: string, form: DividendForm) =>
        !!(await withToast(() => updateMutation.mutateAsync({ id, form }), {
            loading: "Salvando provento...",
            success: "Provento atualizado",
            error: "Não foi possível salvar o provento",
        }))

    const deleteDividend = async (id: string) =>
        !!(await withToast(() => deleteMutation.mutateAsync(id), {
            loading: "Excluindo provento...",
            success: "Provento excluído",
            error: "Não foi possível excluir o provento",
        }))

    return {
        dividends: data?.dividends ?? [],
        totals: data?.totals ?? emptyTotals,
        loading,
        createDividend,
        updateDividend,
        deleteDividend,
    }
}
