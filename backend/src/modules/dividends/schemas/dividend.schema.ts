// Schemas de entrada de proventos: informe o valor por cota OU o total; a quantidade de cotas é opcional
// e, se omitida, usa a posição atual do ativo.
import { z } from "zod"
import { dividendKindValues } from "../../../db/schema"
import { dateString, monthString, perUnitAmount, positiveCents } from "../../../schemas/responses"
import { quantity } from "../../asset-trades/schemas/asset-trade.schema"

const datesInOrder = (data: { comDate?: string | null; payDate?: string }) =>
    !data.comDate || !data.payDate || data.comDate <= data.payDate

const DATES_MESSAGE = "A data com não pode ser depois da data de pagamento"

export const createDividendSchema = z
    .object({
        assetId: z.string().min(1).max(64),
        kind: z.enum(dividendKindValues),
        quantity: quantity().optional(),
        amountPerUnit: perUnitAmount().optional(),
        totalCents: positiveCents().optional(),
        comDate: dateString().nullable().optional(),
        payDate: dateString(),
        // Conta que recebeu: cria a receita paga já creditada (vira "Entradas" e saldo).
        accountId: z.string().min(1).max(64).optional(),
    })
    .refine((data) => data.amountPerUnit !== undefined || data.totalCents !== undefined, {
        message: "Informe o valor por cota ou o total",
        path: ["amountPerUnit"],
    })
    .refine(datesInOrder, { message: DATES_MESSAGE, path: ["comDate"] })

export const updateDividendSchema = z
    .object({
        assetId: z.string().min(1).max(64).optional(),
        kind: z.enum(dividendKindValues).optional(),
        quantity: quantity().optional(),
        amountPerUnit: perUnitAmount().optional(),
        totalCents: positiveCents().optional(),
        comDate: dateString().nullable().optional(),
        payDate: dateString().optional(),
        accountId: z.string().min(1).max(64).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo")
    .refine(datesInOrder, { message: DATES_MESSAGE, path: ["comDate"] })

export const listDividendsQuerySchema = z.object({ month: monthString().optional() })

export const upcomingDividendsQuerySchema = z.object({
    months: z.coerce.number().int().min(1).max(12).default(3),
})

export type CreateDividendInput = z.infer<typeof createDividendSchema>
export type UpdateDividendInput = z.infer<typeof updateDividendSchema>
