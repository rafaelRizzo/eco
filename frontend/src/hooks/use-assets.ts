// Ativos de investimento (ações, FIIs, cripto, dólar): tipos, schema do formulário e CRUD com posição calculada no backend.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { api } from "@/lib/api"
import { invalidateInvestments, invalidateMoney, withToast } from "@/lib/mutation"
import { parseQuantity } from "./use-asset-trades"

export type AssetClass = "stock" | "reit" | "crypto" | "currency" | "other"

export const assetClassLabels: Record<AssetClass, string> = {
    stock: "Ação",
    reit: "FII",
    crypto: "Cripto",
    currency: "Moeda (ex: dólar)",
    other: "Outro",
}

export type DividendFrequency = "none" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual"

export const dividendFrequencyLabels: Record<DividendFrequency, string> = {
    none: "Sem recorrência",
    monthly: "Mensal",
    bimonthly: "Bimestral",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    annual: "Anual",
}

// FII paga todo mês; o resto começa sem recorrência (o usuário ajusta).
export const defaultFrequency = (assetClass: AssetClass): DividendFrequency => (assetClass === "reit" ? "monthly" : "none")

export type Asset = {
    id: string
    ticker: string
    name: string
    class: AssetClass
    dividendFrequency: DividendFrequency
    // Provento esperado por cota (R$) e data do próximo pagamento; base da estimativa.
    dividendPerUnit: number | null
    nextDividendDate: string | null
    currentPriceCents: number | null
    priceUpdatedAt: string | null
    quantity: number
    avgPriceCents: number
    costCents: number
    valueCents: number
    profitCents: number
    profitPercent: number | null
    priceMissing: boolean
}

export type PortfolioSummary = {
    totalValueCents: number
    totalCostCents: number
    profitCents: number
    byClass: { class: AssetClass; valueCents: number; percent: number }[]
}

export const assetFormSchema = z.object({
    ticker: z.string().trim().min(1, "Informe o ticker").max(20),
    class: z.enum(["stock", "reit", "crypto", "currency", "other"]),
    dividendFrequency: z.enum(["none", "monthly", "bimonthly", "quarterly", "semiannual", "annual"]),
    // Texto (aceita vírgula, até 6 casas); vazio = não informado.
    dividendPerUnit: z
        .string()
        .trim()
        .refine((value) => value === "" || /^\d+([.,]\d{1,6})?$/.test(value), "Use um número com até 6 casas decimais")
        .refine((value) => value === "" || Number(value.replace(",", ".")) > 0, "Informe um valor maior que zero"),
    nextDividendDate: z.string(),
    // Posição que já tem (só no cadastro): quantidade em texto (vazio = nenhuma) e preço médio em centavos.
    initialQuantity: z
        .string()
        .trim()
        .refine((value) => value === "" || /^\d+([.,]\d{1,8})?$/.test(value), "Use um número com até 8 casas decimais")
        .refine((value) => value === "" || parseQuantity(value) > 0, "Informe uma quantidade maior que zero"),
    initialAvgPriceCents: z.number().int().min(0),
    // 0 = sem cotação informada.
    currentPriceCents: z.number().int().min(0),
})

export type AssetForm = z.infer<typeof assetFormSchema>

// O nome é opcional na tela: quando igual ao ticker, mostra só o ticker.
export const assetLabel = (asset: { ticker: string; name: string }) =>
    asset.name === asset.ticker ? asset.ticker : `${asset.ticker} · ${asset.name}`

type AssetPayload = {
    ticker: string
    name: string
    class: AssetClass
    dividendFrequency: DividendFrequency
    dividendPerUnit: number | null
    nextDividendDate: string | null
    currentPriceCents: number | null
}

const emptySummary: PortfolioSummary = { totalValueCents: 0, totalCostCents: 0, profitCents: 0, byClass: [] }

export const toAssetPayload = ({ initialQuantity: _q, initialAvgPriceCents: _p, ...form }: AssetForm): AssetPayload => ({
    ...form,
    name: form.ticker.trim().toUpperCase(),
    // Sem recorrência não há estimativa: limpa os campos de provento esperado.
    dividendPerUnit:
        form.dividendFrequency === "none" || !form.dividendPerUnit ? null : Number(form.dividendPerUnit.replace(",", ".")),
    nextDividendDate: form.dividendFrequency === "none" ? null : form.nextDividendDate || null,
    currentPriceCents: form.currentPriceCents || null,
})

export function useAssets() {
    const queryClient = useQueryClient()
    const { data, isLoading: loading } = useQuery({
        queryKey: ["assets"],
        queryFn: async () => (await api.get<{ assets: Asset[]; summary: PortfolioSummary }>("/assets")).data,
    })

    const createMutation = useMutation({
        mutationFn: async (payload: AssetPayload & { initialQuantity?: number; initialAvgPriceCents?: number }) => (await api.post<{ asset: Asset }>("/assets", payload)).data.asset,
        onSuccess: () => invalidateInvestments(queryClient),
    })
    const updateMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<AssetPayload> }) =>
            (await api.patch<{ asset: Asset }>(`/assets/${id}`, payload)).data.asset,
        onSuccess: () => invalidateInvestments(queryClient),
    })
    const deleteMutation = useMutation({
        // cascade: apaga operações, proventos e as receitas creditadas deles (mexe em saldo e entradas).
        mutationFn: async (id: string) => api.delete(`/assets/${id}`, { params: { cascade: true } }),
        onSuccess: () => Promise.all([invalidateInvestments(queryClient), invalidateMoney(queryClient)]),
    })

    const createAsset = async (form: AssetForm) =>
        !!(await withToast(
            () =>
                createMutation.mutateAsync({
                    ...toAssetPayload(form),
                    ...(form.initialQuantity
                        ? {
                              initialQuantity: parseQuantity(form.initialQuantity),
                              initialAvgPriceCents: form.initialAvgPriceCents,
                          }
                        : {}),
                }),
            {
            loading: "Cadastrando ativo...",
            success: "Ativo cadastrado",
            error: "Não foi possível cadastrar o ativo",
        },
    ))

    const updateAsset = async (id: string, payload: Partial<AssetPayload>) =>
        !!(await withToast(() => updateMutation.mutateAsync({ id, payload }), {
            loading: "Salvando ativo...",
            success: "Ativo atualizado",
            error: "Não foi possível salvar o ativo",
        }))

    const deleteAsset = async (id: string) =>
        !!(await withToast(() => deleteMutation.mutateAsync(id), {
            loading: "Excluindo ativo...",
            success: "Ativo excluído",
            error: "Não foi possível excluir o ativo",
        }))

    return {
        assets: data?.assets ?? [],
        summary: data?.summary ?? emptySummary,
        loading,
        createAsset,
        updateAsset,
        deleteAsset,
    }
}
