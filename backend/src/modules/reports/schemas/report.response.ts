// Schemas de resposta dos relatórios (resumo mensal e próximos vencimentos).
import { z } from "zod"
import { transactionTypeValues } from "../../../db/schema"
import { InvoiceSchema } from "../../invoices/schemas/invoice.response"
import { TransactionSchema } from "../../transactions/schemas/transaction.response"

const envelope = { success: z.literal(true), message: z.string() }

export const MonthlySummarySchema = z.object({
    month: z.string(),
    incomeCents: z.number().int(),
    expenseCents: z.number().int(),
    netCents: z.number().int(),
    paidIncomeCents: z.number().int(),
    paidExpenseCents: z.number().int(),
    totalBalanceCents: z.number().int(),
    byCategory: z.array(
        z.object({
            categoryId: z.string().nullable(),
            name: z.string(),
            color: z.string().nullable(),
            type: z.enum(transactionTypeValues),
            totalCents: z.number().int(),
        }),
    ),
})

export const MonthlySummaryResponse = z.object({ ...envelope, summary: MonthlySummarySchema })

export const UpcomingResponse = z.object({
    ...envelope,
    until: z.string(),
    bills: z.array(TransactionSchema),
    invoices: z.array(InvoiceSchema),
})
