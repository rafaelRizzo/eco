// Cron de lembretes: avisa contas e faturas que vencem nos próximos REMINDER_DAYS_BEFORE dias.
import { and, eq, gte, isNotNull, lte, ne } from "drizzle-orm"
import { invoices, transactions } from "../db/schema"
import { env } from "../env"
import { addDays } from "../lib/dates"
import { db } from "../lib/db"
import { formatCents, formatDateBr } from "../lib/money"
import { computeInvoiceTotals } from "../modules/invoices/invoices.service"
import { notify } from "../modules/notifications/notifications.service"
import type { JobDefinition } from "./job-runner"

const dueLabel = (date: string, today: string) => (date === today ? "vence hoje" : `vence em ${formatDateBr(date)}`)

export const remindersJob: JobDefinition = {
    name: "reminders",
    description: "Lembra contas e faturas próximas do vencimento",
    schedule: "0 8 * * *",
    run: async ({ today }) => {
        const until = addDays(today, env.REMINDER_DAYS_BEFORE)

        const [bills, dueInvoices] = await Promise.all([
            db.query.transactions.findMany({
                where: and(
                    eq(transactions.status, "pending"),
                    eq(transactions.type, "expense"),
                    isNotNull(transactions.accountId),
                    gte(transactions.date, today),
                    lte(transactions.date, until),
                ),
            }),
            db.query.invoices.findMany({
                where: and(ne(invoices.status, "paid"), gte(invoices.dueDate, today), lte(invoices.dueDate, until)),
            }),
        ])

        let notified = 0

        for (const bill of bills) {
            // Data na chave: se o vencimento mudar, o lembrete é enviado de novo.
            const created = await notify(db, {
                userId: bill.userId,
                type: "bill_due",
                transactionId: bill.id,
                dedupeKey: `bill_due:${bill.id}:${bill.date}`,
                title: `${bill.description} ${dueLabel(bill.date, today)}`,
                message: `Conta de ${formatCents(bill.amountCents)} ${dueLabel(bill.date, today)}.`,
            })
            if (created) notified++
        }

        const totals = await computeInvoiceTotals(dueInvoices.map((invoice) => invoice.id))
        for (const invoice of dueInvoices) {
            const total = totals.get(invoice.id) ?? 0
            if (total <= 0) continue
            const created = await notify(db, {
                userId: invoice.userId,
                type: "invoice_due",
                invoiceId: invoice.id,
                dedupeKey: `invoice_due:${invoice.id}:${invoice.dueDate}`,
                title: `Fatura ${invoice.referenceMonth} ${dueLabel(invoice.dueDate, today)}`,
                message: `Fatura de ${formatCents(total)} ${dueLabel(invoice.dueDate, today)}.`,
            })
            if (created) notified++
        }

        return { bills: bills.length, invoices: dueInvoices.length, notified }
    },
}
