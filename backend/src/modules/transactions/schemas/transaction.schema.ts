// Schemas de entrada de lançamentos (conta ou cartão, à vista ou parcelado no cartão).
import { z } from "zod"
import { transactionStatusValues, transactionTypeValues } from "../../../db/schema"
import { dateString, monthString, positiveCents } from "../../../schemas/responses"

export const createTransactionSchema = z
    .object({
        type: z.enum(transactionTypeValues),
        description: z.string().trim().min(1, "Informe a descrição").max(160),
        // Em compra parcelada é o valor TOTAL; o service divide entre as parcelas.
        amountCents: positiveCents(),
        date: dateString(),
        categoryId: z.string().min(1).nullable().optional(),
        accountId: z.string().min(1).optional(),
        creditCardId: z.string().min(1).optional(),
        // Só pra lançamento em conta; no cartão o status segue a fatura.
        status: z.enum(["pending", "paid"]).optional(),
        installments: z.number().int().min(1).max(48).default(1),
        notes: z.string().trim().max(500).nullable().optional(),
    })
    .refine((data) => Boolean(data.accountId) !== Boolean(data.creditCardId), {
        message: "Informe accountId OU creditCardId",
        path: ["accountId"],
    })
    .refine((data) => data.installments === 1 || Boolean(data.creditCardId), {
        message: "Parcelamento só é permitido no cartão de crédito",
        path: ["installments"],
    })

// Conta/cartão/tipo não mudam: pra isso exclua e recrie o lançamento.
export const updateTransactionSchema = z
    .object({
        description: z.string().trim().min(1).max(160),
        amountCents: positiveCents(),
        date: dateString(),
        categoryId: z.string().min(1).nullable(),
        notes: z.string().trim().max(500).nullable(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo")

export const transactionQuerySchema = z
    .object({
        month: monthString().optional(),
        from: dateString().optional(),
        to: dateString().optional(),
        type: z.enum(transactionTypeValues).optional(),
        status: z.enum(transactionStatusValues).optional(),
        categoryId: z.string().min(1).optional(),
        accountId: z.string().min(1).optional(),
        creditCardId: z.string().min(1).optional(),
        invoiceId: z.string().min(1).optional(),
    })
    .refine((data) => !(data.month && (data.from || data.to)), "Use month OU from/to")

export const payTransactionSchema = z.object({
    paidAt: z.iso.datetime({ offset: true }).optional(),
})

export const deleteTransactionQuerySchema = z.object({
    // "installments" exclui todas as parcelas da mesma compra.
    scope: z.enum(["single", "installments"]).default("single"),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransactionQuery = z.infer<typeof transactionQuerySchema>
export type PayTransactionInput = z.infer<typeof payTransactionSchema>
export type DeleteTransactionQuery = z.infer<typeof deleteTransactionQuerySchema>
