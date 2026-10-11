// Schemas de entrada de faturas.
import { z } from "zod"
import { invoiceStatusValues } from "../../../db/schema"

export const invoiceQuerySchema = z.object({
    creditCardId: z.string().min(1).optional(),
    status: z.enum(invoiceStatusValues).optional(),
})

export const payInvoiceSchema = z.object({
    // Sem accountId usa a conta de pagamento padrão do cartão.
    accountId: z.string().min(1).optional(),
    paidAt: z.iso.datetime({ offset: true }).optional(),
})

export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>
