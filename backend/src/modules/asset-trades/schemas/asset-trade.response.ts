// Schemas de resposta das operações de compra/venda de ativos.
import { z } from "zod"
import { tradeTypeValues } from "../../../db/schema"

export const AssetTradeSchema = z.object({
    id: z.string(),
    assetId: z.string(),
    ticker: z.string(),
    assetName: z.string(),
    type: z.enum(tradeTypeValues),
    quantity: z.number(),
    unitPriceCents: z.number().int(),
    feesCents: z.number().int(),
    // Compra: quantidade × preço + taxas. Venda: quantidade × preço − taxas.
    totalCents: z.number().int(),
    tradedAt: z.string(),
    notes: z.string().nullable(),
    createdAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const CreateAssetTradeResponse = z.object({ ...envelope, trade: AssetTradeSchema })
export const ListAssetTradesResponse = z.object({ ...envelope, trades: z.array(AssetTradeSchema) })
