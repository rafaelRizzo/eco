// Operações de compra/venda de ativos: schema do formulário (quantidade como texto, aceita vírgula) e CRUD.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { api } from "@/lib/api"
import { invalidateInvestments, withToast } from "@/lib/mutation"

export type TradeType = "buy" | "sell"

export const tradeTypeLabels: Record<TradeType, string> = { buy: "Compra", sell: "Venda" }

export type AssetTrade = {
    id: string
    assetId: string
    ticker: string
    assetName: string
    type: TradeType
    quantity: number
    unitPriceCents: number
    feesCents: number
    totalCents: number
    tradedAt: string
    notes: string | null
}

// Quantidade é fracionada (cripto/dólar): o campo é texto, aceita "0,5" e "0.5", até 8 casas.
export const parseQuantity = (value: string) => Number(value.trim().replace(",", "."))

export const formatQuantity = (value: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(value)

export const quantityText = z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,8})?$/, "Use um número com até 8 casas decimais")
    .refine((value) => parseQuantity(value) > 0, "Informe uma quantidade maior que zero")

export const tradeFormSchema = z.object({
    assetId: z.string().min(1, "Escolha o ativo"),
    type: z.enum(["buy", "sell"]),
    quantity: quantityText,
    unitPriceCents: z.number().int().min(0),
    feesCents: z.number().int().min(0),
    tradedAt: z.iso.date("Informe a data"),
    notes: z.string().trim().max(500),
})

export type TradeForm = z.infer<typeof tradeFormSchema>

export function useAssetTrades() {
    const queryClient = useQueryClient()
    const { data: trades = [], isLoading: loading } = useQuery({
        queryKey: ["asset-trades"],
        queryFn: async () => (await api.get<{ trades: AssetTrade[] }>("/asset-trades")).data.trades,
    })

    const createMutation = useMutation({
        mutationFn: async (form: TradeForm) =>
            (
                await api.post<{ trade: AssetTrade }>("/asset-trades", {
                    ...form,
                    quantity: parseQuantity(form.quantity),
                    notes: form.notes || undefined,
                })
            ).data.trade,
        onSuccess: () => invalidateInvestments(queryClient),
    })
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/asset-trades/${id}`),
        onSuccess: () => invalidateInvestments(queryClient),
    })

    const createTrade = async (form: TradeForm) =>
        !!(await withToast(() => createMutation.mutateAsync(form), {
            loading: "Registrando operação...",
            success: "Operação registrada",
            error: "Não foi possível registrar a operação",
        }))

    const deleteTrade = async (id: string) =>
        !!(await withToast(() => deleteMutation.mutateAsync(id), {
            loading: "Excluindo operação...",
            success: "Operação excluída",
            error: "Não foi possível excluir a operação",
        }))

    return { trades, loading, createTrade, deleteTrade }
}
