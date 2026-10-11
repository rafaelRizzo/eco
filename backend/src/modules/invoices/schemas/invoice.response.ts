// Schemas de resposta de faturas (total calculado a partir dos lançamentos).
import { z } from "zod"
import { invoiceStatusValues } from "../../../db/schema"
import { TransactionSchema } from "../../transactions/schemas/transaction.response"

export const InvoiceSchema = z.object({
    id: z.string(),
    creditCardId: z.string(),
    referenceMonth: z.string(),
    closingDate: z.string(),
    dueDate: z.string(),
    status: z.enum(invoiceStatusValues),
    totalCents: z.number().int(),
    paidAt: z.date().nullable(),
    paidAmountCents: z.number().int().nullable(),
    paidFromAccountId: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const ListInvoicesResponse = z.object({ ...envelope, invoices: z.array(InvoiceSchema) })
export const GetInvoiceResponse = z.object({
    ...envelope,
    invoice: InvoiceSchema.extend({ transactions: z.array(TransactionSchema) }),
})
export const PayInvoiceResponse = z.object({ ...envelope, invoice: InvoiceSchema })
