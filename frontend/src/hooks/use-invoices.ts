// Faturas de cartão: listagem por cartão, detalhe com lançamentos e pagamento.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { invalidateMoney, withToast } from "@/lib/mutation"
import type { Transaction } from "./use-transactions"

export type InvoiceStatus = "open" | "closed" | "paid" | "overdue"

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
    open: "Aberta",
    closed: "Fechada",
    paid: "Paga",
    overdue: "Atrasada",
}

export type Invoice = {
    id: string
    creditCardId: string
    referenceMonth: string
    closingDate: string
    dueDate: string
    status: InvoiceStatus
    totalCents: number
    paidAt: string | null
    paidAmountCents: number | null
    paidFromAccountId: string | null
    createdAt: string
    updatedAt: string
}

export type InvoiceDetail = Invoice & { transactions: Transaction[] }

export function useInvoices(creditCardId: string) {
    const queryClient = useQueryClient()
    const { data: invoices = [], isLoading: loading } = useQuery({
        queryKey: ["invoices", { creditCardId }],
        queryFn: async () =>
            (await api.get<{ invoices: Invoice[] }>("/invoices", { params: { creditCardId } })).data.invoices,
    })

    const payMutation = useMutation({
        mutationFn: async ({ id, accountId }: { id: string; accountId: string }) =>
            (await api.post<{ invoice: Invoice }>(`/invoices/${id}/pay`, { accountId })).data.invoice,
        onSuccess: () => invalidateMoney(queryClient),
    })

    const payInvoice = async (id: string, accountId: string) =>
        !!(await withToast(() => payMutation.mutateAsync({ id, accountId }), {
            loading: "Pagando fatura...",
            success: "Fatura paga",
            error: "Não foi possível pagar a fatura",
        }))

    return { invoices, loading, payInvoice }
}

// Faturas de todos os cartões (régua do mês e próximos vencimentos).
export function useAllInvoices() {
    const { data: invoices = [], isLoading: loading } = useQuery({
        queryKey: ["invoices", "all"],
        queryFn: async () => (await api.get<{ invoices: Invoice[] }>("/invoices")).data.invoices,
    })
    return { invoices, loading }
}

export function useInvoice(id: string | null) {
    const { data: invoice = null, isLoading: loading } = useQuery({
        queryKey: ["invoices", id],
        queryFn: async () => (await api.get<{ invoice: InvoiceDetail }>(`/invoices/${id}`)).data.invoice,
        enabled: !!id,
    })
    return { invoice, loading }
}
