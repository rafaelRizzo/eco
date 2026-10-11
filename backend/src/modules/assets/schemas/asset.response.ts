// Schemas de resposta de ativos: posição (qtd, preço médio, custo) e avaliação calculadas na leitura.
import { z } from "zod"
import { assetClassValues, dividendFrequencyValues } from "../../../db/schema"

export const AssetSchema = z.object({
    id: z.string(),
    ticker: z.string(),
    name: z.string(),
    class: z.enum(assetClassValues),
    dividendFrequency: z.enum(dividendFrequencyValues),
    // Provento esperado por cota (R$) e data do próximo pagamento, informados pelo usuário.
    dividendPerUnit: z.number().nullable(),
    nextDividendDate: z.string().nullable(),
    currentPriceCents: z.number().int().nullable(),
    priceUpdatedAt: z.date().nullable(),
    quantity: z.number(),
    avgPriceCents: z.number().int(),
    costCents: z.number().int(),
    valueCents: z.number().int(),
    profitCents: z.number().int(),
    profitPercent: z.number().nullable(),
    priceMissing: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

const SummarySchema = z.object({
    totalValueCents: z.number().int(),
    totalCostCents: z.number().int(),
    profitCents: z.number().int(),
    byClass: z.array(z.object({ class: z.enum(assetClassValues), valueCents: z.number().int(), percent: z.number() })),
})

const envelope = { success: z.literal(true), message: z.string() }

export const CreateAssetResponse = z.object({ ...envelope, asset: AssetSchema })
export const UpdateAssetResponse = CreateAssetResponse
export const ListAssetsResponse = z.object({ ...envelope, assets: z.array(AssetSchema), summary: SummarySchema })
