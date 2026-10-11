// Cron de faturas: fecha as que chegaram no dia de fechamento e marca como atrasadas as vencidas sem pagamento.
import { and, eq, inArray, lt, lte } from "drizzle-orm"
import { invoices } from "../db/schema"
import { db } from "../lib/db"
import { formatCents, formatDateBr } from "../lib/money"
import { computeInvoiceTotals } from "../modules/invoices/invoices.service"
import { notify } from "../modules/notifications/notifications.service"
import type { JobDefinition } from "./job-runner"

export const invoicesJob: JobDefinition = {
    name: "invoices",
    description: "Fecha faturas no dia de fechamento e marca faturas vencidas como atrasadas",
    schedule: "10 0 * * *",
    run: async ({ today }) => {
        const closed = await db
            .update(invoices)
            .set({ status: "closed" })
            .where(and(eq(invoices.status, "open"), lte(invoices.closingDate, today)))
            .returning()

        const overdue = await db
            .update(invoices)
            .set({ status: "overdue" })
            .where(and(inArray(invoices.status, ["open", "closed"]), lt(invoices.dueDate, today)))
            .returning()

        const totals = await computeInvoiceTotals([...closed, ...overdue].map((invoice) => invoice.id))
        let notified = 0

        for (const invoice of closed) {
            const total = totals.get(invoice.id) ?? 0
            if (total <= 0) continue
            const created = await notify(db, {
                userId: invoice.userId,
                type: "invoice_closed",
                invoiceId: invoice.id,
                dedupeKey: `invoice_closed:${invoice.id}`,
                title: `Fatura ${invoice.referenceMonth} fechada`,
                message: `Total de ${formatCents(total)}, vence em ${formatDateBr(invoice.dueDate)}.`,
            })
            if (created) notified++
        }

        for (const invoice of overdue) {
            const total = totals.get(invoice.id) ?? 0
            if (total <= 0) continue
            const created = await notify(db, {
                userId: invoice.userId,
                type: "invoice_overdue",
                invoiceId: invoice.id,
                dedupeKey: `invoice_overdue:${invoice.id}`,
                title: `Fatura ${invoice.referenceMonth} atrasada`,
                message: `A fatura de ${formatCents(total)} venceu em ${formatDateBr(invoice.dueDate)} e não foi paga.`,
            })
            if (created) notified++
        }

        return { closed: closed.length, overdue: overdue.length, notified }
    },
}
