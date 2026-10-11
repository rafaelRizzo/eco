// Cron de contas em conta corrente: quita débitos automáticos que venceram e marca o resto vencido como atrasado.
import { and, eq, inArray, isNotNull, lt, lte } from "drizzle-orm"
import { recurringTransactions, transactions } from "../db/schema"
import { db } from "../lib/db"
import { formatCents, formatDateBr } from "../lib/money"
import { notify } from "../modules/notifications/notifications.service"
import type { JobDefinition } from "./job-runner"

export const billsJob: JobDefinition = {
    name: "bills",
    description: "Quita débitos automáticos e marca contas vencidas como atrasadas",
    schedule: "15 0 * * *",
    run: async ({ today }) => {
        const autoPayRecurrences = db
            .select({ id: recurringTransactions.id })
            .from(recurringTransactions)
            .where(eq(recurringTransactions.autoPay, true))

        const autoPaid = await db
            .update(transactions)
            .set({ status: "paid", paidAt: new Date() })
            .where(
                and(
                    inArray(transactions.status, ["pending", "overdue"]),
                    isNotNull(transactions.accountId),
                    lte(transactions.date, today),
                    inArray(transactions.recurringTransactionId, autoPayRecurrences),
                ),
            )
            .returning({ id: transactions.id })

        const overdue = await db
            .update(transactions)
            .set({ status: "overdue" })
            .where(and(eq(transactions.status, "pending"), isNotNull(transactions.accountId), lt(transactions.date, today)))
            .returning()

        let notified = 0
        for (const bill of overdue) {
            const isExpense = bill.type === "expense"
            const created = await notify(db, {
                userId: bill.userId,
                type: "bill_overdue",
                transactionId: bill.id,
                dedupeKey: `bill_overdue:${bill.id}:${bill.date}`,
                title: isExpense ? `Conta atrasada: ${bill.description}` : `Recebimento atrasado: ${bill.description}`,
                message: `${formatCents(bill.amountCents)} com vencimento em ${formatDateBr(bill.date)}.`,
            })
            if (created) notified++
        }

        return { autoPaid: autoPaid.length, overdue: overdue.length, notified }
    },
}
