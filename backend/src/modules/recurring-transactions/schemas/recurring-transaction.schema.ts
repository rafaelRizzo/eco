// Schemas de entrada de recorrências (mensalidades, assinaturas, salário...).
import { z } from "zod"
import { recurrenceFrequencyValues, transactionTypeValues } from "../../../db/schema"
import { dateString, positiveCents } from "../../../schemas/responses"

export const createRecurringTransactionSchema = z
    .object({
        description: z.string().trim().min(1, "Informe a descrição").max(160),
        amountCents: positiveCents(),
        type: z.enum(transactionTypeValues),
        frequency: z.enum(recurrenceFrequencyValues).default("monthly"),
        categoryId: z.string().min(1).nullable().optional(),
        accountId: z.string().min(1).optional(),
        creditCardId: z.string().min(1).optional(),
        // Primeiro vencimento; o dia dele vira o dia fixo das próximas ocorrências.
        startDate: dateString(),
        endDate: dateString().nullable().optional(),
        autoPay: z.boolean().default(false),
    })
    .refine((data) => Boolean(data.accountId) !== Boolean(data.creditCardId), {
        message: "Informe accountId OU creditCardId",
        path: ["accountId"],
    })
    .refine((data) => !data.endDate || data.endDate >= data.startDate, {
        message: "endDate precisa ser depois de startDate",
        path: ["endDate"],
    })

// Frequência/data inicial/destino não mudam: pra isso exclua e recrie. Mudança vale só pras próximas ocorrências.
export const updateRecurringTransactionSchema = z
    .object({
        description: z.string().trim().min(1).max(160),
        amountCents: positiveCents(),
        categoryId: z.string().min(1).nullable(),
        endDate: dateString().nullable(),
        autoPay: z.boolean(),
        active: z.boolean(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo")

export const recurringTransactionQuerySchema = z.object({
    active: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
})

export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>
export type RecurringTransactionQuery = z.infer<typeof recurringTransactionQuerySchema>
