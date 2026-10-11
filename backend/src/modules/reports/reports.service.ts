// Relatórios: resumo do mês (regime de competência, compras no cartão contam na data da compra)
// e próximos vencimentos. Pagamento de fatura não é lançamento, então não duplica despesa.
import { and, asc, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm"
import { categories, invoices, transactions } from "../../db/schema"
import { env } from "../../env"
import { addDays, monthRange, toMonthKey, todayIn } from "../../lib/dates"
import { db } from "../../lib/db"
import { listAccounts } from "../accounts/accounts.service"
import { computeInvoiceTotals } from "../invoices/invoices.service"
import type { SummaryQuery, UpcomingQuery } from "./schemas/report.schema"

export const getMonthlySummary = async (userId: string, query: SummaryQuery) => {
    const month = query.month ?? toMonthKey(todayIn(env.APP_TIMEZONE))
    const { start, end } = monthRange(month)
    const inMonth = and(eq(transactions.userId, userId), gte(transactions.date, start), lte(transactions.date, end))

    const [totals, byCategory, accounts] = await Promise.all([
        db
            .select({
                type: transactions.type,
                total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)::int`,
                paid: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.status} = 'paid'), 0)::int`,
            })
            .from(transactions)
            .where(inMonth)
            .groupBy(transactions.type),
        db
            .select({
                categoryId: transactions.categoryId,
                name: sql<string>`coalesce(${categories.name}, 'Sem categoria')`,
                color: categories.color,
                type: transactions.type,
                totalCents: sql<number>`sum(${transactions.amountCents})::int`,
            })
            .from(transactions)
            .leftJoin(categories, eq(categories.id, transactions.categoryId))
            .where(inMonth)
            .groupBy(transactions.categoryId, categories.name, categories.color, transactions.type)
            .orderBy(sql`sum(${transactions.amountCents}) desc`),
        listAccounts(userId),
    ])

    const income = totals.find((row) => row.type === "income")
    const expense = totals.find((row) => row.type === "expense")

    return {
        month,
        incomeCents: income?.total ?? 0,
        expenseCents: expense?.total ?? 0,
        netCents: (income?.total ?? 0) - (expense?.total ?? 0),
        paidIncomeCents: income?.paid ?? 0,
        paidExpenseCents: expense?.paid ?? 0,
        totalBalanceCents: accounts.reduce((sum, account) => sum + account.balanceCents, 0),
        byCategory,
    }
}

export const getUpcoming = async (userId: string, query: UpcomingQuery) => {
    const until = addDays(todayIn(env.APP_TIMEZONE), query.days)

    const [bills, openInvoices] = await Promise.all([
        // Contas a pagar/receber em conta (inclui atrasadas); cartão aparece via fatura.
        db.query.transactions.findMany({
            where: and(
                eq(transactions.userId, userId),
                isNull(transactions.creditCardId),
                inArray(transactions.status, ["pending", "overdue"]),
                lte(transactions.date, until),
            ),
            orderBy: [asc(transactions.date)],
        }),
        db.query.invoices.findMany({
            where: and(eq(invoices.userId, userId), ne(invoices.status, "paid"), lte(invoices.dueDate, until)),
            orderBy: [asc(invoices.dueDate)],
        }),
    ])

    const totals = await computeInvoiceTotals(openInvoices.map((invoice) => invoice.id))
    const invoicesWithTotal = openInvoices
        .map((invoice) => ({ ...invoice, totalCents: totals.get(invoice.id) ?? 0 }))
        .filter((invoice) => invoice.totalCents > 0)

    return { until, bills, invoices: invoicesWithTotal }
}
