// Schemas de entrada de ativos de investimento (ticker sempre em maiúsculas, cotação manual em centavos de BRL).
import { z } from "zod"
import { assetClassValues, dividendFrequencyValues } from "../../../db/schema"
import { dateString, MAX_CENTS, perUnitAmount } from "../../../schemas/responses"
import { MAX_TRADE_CENTS, quantity } from "../../asset-trades/schemas/asset-trade.schema"

const ticker = z
    .string()
    .trim()
    .min(1, "Informe o ticker")
    .max(20)
    .transform((value) => value.toUpperCase())

const name = z.string().trim().min(1, "Informe o nome").max(80)
const price = z.number().int().min(0, "A cotação não pode ser negativa").max(MAX_CENTS, "Valor muito grande").nullable()

export const createAssetSchema = z
    .object({
    ticker,
    // Omitido: usa o próprio ticker como nome.
    name: name.optional(),
    class: z.enum(assetClassValues),
    // Omitido: FII = mensal, demais = sem recorrência.
    dividendFrequency: z.enum(dividendFrequencyValues).optional(),
    dividendPerUnit: perUnitAmount().nullable().optional(),
    nextDividendDate: dateString().nullable().optional(),
    currentPriceCents: price.optional(),
    // Posição que o usuário já tem (migração): vira uma compra "posição inicial" com data de hoje.
    initialQuantity: quantity().optional(),
    initialAvgPriceCents: z.number().int().min(0, "O preço não pode ser negativo").max(MAX_CENTS, "Valor muito grande").optional(),
})
    .refine((data) => (data.initialQuantity === undefined) === (data.initialAvgPriceCents === undefined), {
        message: "Informe a quantidade e o preço médio da posição inicial",
        path: ["initialQuantity"],
    })
    .refine((data) => (data.initialQuantity ?? 0) * (data.initialAvgPriceCents ?? 0) <= MAX_TRADE_CENTS, {
        message: "O valor da posição passa de R$ 1 bilhão",
        path: ["initialAvgPriceCents"],
    })

export const updateAssetSchema = z
    .object({
        ticker: ticker.optional(),
        name: name.optional(),
        class: z.enum(assetClassValues).optional(),
        dividendFrequency: z.enum(dividendFrequencyValues).optional(),
        dividendPerUnit: perUnitAmount().nullable().optional(),
        nextDividendDate: dateString().nullable().optional(),
        currentPriceCents: price.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo")

// cascade=true apaga o ativo com operações, proventos e as receitas creditadas deles (sai do saldo).
export const deleteAssetQuerySchema = z.object({
    // Aceita boolean também: o validador da rota já converte "true" em true antes do controller parsear de novo.
    cascade: z
        .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
        .optional()
        .default(false),
})

export type CreateAssetInput = z.infer<typeof createAssetSchema>
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>
