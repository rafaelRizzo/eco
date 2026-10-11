// Schemas de resposta de recorrências.
import { z } from "zod"
import { recurrenceFrequencyValues, transactionTypeValues } from "../../../db/schema"

export const RecurringTransactionSchema = z.object({
    id: z.string(),
    description: z.string(),
    amountCents: z.number().int(),
    type: z.enum(transactionTypeValues),
    frequency: z.enum(recurrenceFrequencyValues),
    categoryId: z.string().nullable(),
    accountId: z.string().nullable(),
    creditCardId: z.string().nullable(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    nextRunDate: z.string(),
    lastRunDate: z.string().nullable(),
    autoPay: z.boolean(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const CreateRecurringTransactionResponse = z.object({
    ...envelope,
    recurringTransaction: RecurringTransactionSchema,
})
export const GetRecurringTransactionResponse = CreateRecurringTransactionResponse
export const UpdateRecurringTransactionResponse = CreateRecurringTransactionResponse
export const ListRecurringTransactionsResponse = z.object({
    ...envelope,
    recurringTransactions: z.array(RecurringTransactionSchema),
})
