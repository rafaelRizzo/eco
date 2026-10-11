// Schemas de entrada das operações de compra/venda (quantidade fracionada com até 8 casas).
import { z } from "zod"
import { tradeTypeValues } from "../../../db/schema"
import { cents, dateString } from "../../../schemas/responses"

export const quantity = () =>
    z
        .number()
        .positive("Quantidade precisa ser maior que zero")
        .max(100_000_000_000, "Quantidade muito grande")
        .refine((value) => Math.abs(Math.round(value * 1e8) / 1e8 - value) < 1e-12, "Use no máximo 8 casas decimais")

// Teto de R$ 1 bi por operação: mantém somas e produtos dentro de inteiros seguros do JS.
export const MAX_TRADE_CENTS = 100_000_000_000

export const createAssetTradeSchema = z
    .object({
        assetId: z.string().min(1).max(64),
        type: z.enum(tradeTypeValues),
        quantity: quantity(),
        unitPriceCents: cents().min(0, "O preço não pode ser negativo"),
        feesCents: cents().min(0, "As taxas não podem ser negativas").default(0),
        tradedAt: dateString(),
        notes: z.string().trim().max(500).optional(),
    })
    .refine((data) => data.quantity * data.unitPriceCents <= MAX_TRADE_CENTS, {
        message: "O valor da operação passa de R$ 1 bilhão",
        path: ["unitPriceCents"],
    })

export const listAssetTradesQuerySchema = z.object({
    assetId: z.string().min(1).max(64).optional(),
})

export type CreateAssetTradeInput = z.infer<typeof createAssetTradeSchema>
