// Schemas de resposta de lançamentos.
import { z } from "zod"
import { transactionStatusValues, transactionTypeValues } from "../../../db/schema"

export const TransactionSchema = z.object({
    id: z.string(),
    type: z.enum(transactionTypeValues),
    status: z.enum(transactionStatusValues),
    description: z.string(),
    amountCents: z.number().int(),
    date: z.string(),
    paidAt: z.date().nullable(),
    categoryId: z.string().nullable(),
    accountId: z.string().nullable(),
    creditCardId: z.string().nullable(),
    invoiceId: z.string().nullable(),
    recurringTransactionId: z.string().nullable(),
    installmentGroupId: z.string().nullable(),
    installmentNumber: z.number().int().nullable(),
    installmentTotal: z.number().int().nullable(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

// Create devolve lista: compra parcelada gera um lançamento por parcela.
export const CreateTransactionResponse = z.object({ ...envelope, transactions: z.array(TransactionSchema) })
export const GetTransactionResponse = z.object({ ...envelope, transaction: TransactionSchema })
export const UpdateTransactionResponse = GetTransactionResponse
export const PayTransactionResponse = GetTransactionResponse
export const ListTransactionsResponse = z.object({ ...envelope, transactions: z.array(TransactionSchema) })
export const DeleteTransactionResponse = z.object({ ...envelope, deletedCount: z.number().int() })
