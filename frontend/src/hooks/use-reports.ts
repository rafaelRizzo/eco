// Relatórios do dashboard: resumo mensal por categoria e próximos vencimentos.
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { TransactionType } from "./use-categories"
import type { Invoice } from "./use-invoices"
import type { Transaction } from "./use-transactions"

export type MonthlySummary = {
    month: string
    incomeCents: number
    expenseCents: number
    netCents: number
    paidIncomeCents: number
    paidExpenseCents: number
    totalBalanceCents: number
    byCategory: {
        categoryId: string | null
        name: string
        color: string | null
        type: TransactionType
        totalCents: number
    }[]
}

export type Upcoming = { until: string; bills: Transaction[]; invoices: Invoice[] }

export function useMonthlySummary(month: string) {
    const { data: summary = null, isLoading: loading } = useQuery({
        queryKey: ["reports", "summary", month],
        queryFn: async () =>
            (await api.get<{ summary: MonthlySummary }>("/reports/summary", { params: { month } })).data.summary,
        placeholderData: keepPreviousData,
    })
    return { summary, loading }
}

export function useUpcoming(days = 45) {
    const { data: upcoming = null, isLoading: loading } = useQuery({
        queryKey: ["reports", "upcoming", days],
        queryFn: async () => (await api.get<Upcoming>("/reports/upcoming", { params: { days } })).data,
    })
    return { upcoming, loading }
}
