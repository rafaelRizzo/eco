// Regras de faturas: resolve/cria a fatura do ciclo de uma compra, calcula total e registra pagamento.
import { and, eq, inArray } from "drizzle-orm"
import { type CreditCard, type Invoice, invoices, transactions } from "../../db/schema"
import { resolveInvoiceCycle } from "../../lib/billing"
import { type DbOrTx, db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import { findOwnedAccount } from "../accounts/accounts.service"
import { findOwnedCreditCard, signedCardAmount } from "../credit-cards/credit-cards.service"
import type { InvoiceQuery, PayInvoiceInput } from "./schemas/invoice.schema"

// Idempotente e seguro contra corrida: insert com on conflict + select pela unique (cartão, mês).
export const getOrCreateInvoiceForDate = async (executor: DbOrTx, creditCard: CreditCard, purchaseDate: string) => {
    const cycle = resolveInvoiceCycle(purchaseDate, creditCard.closingDay, creditCard.dueDay)

    await executor
        .insert(invoices)
        .values({ userId: creditCard.userId, creditCardId: creditCard.id, ...cycle })
        .onConflictDoNothing({ target: [invoices.creditCardId, invoices.referenceMonth] })

    const invoice = await executor.query.invoices.findFirst({
        where: and(eq(invoices.creditCardId, creditCard.id), eq(invoices.referenceMonth, cycle.referenceMonth)),
    })
    if (!invoice) throw new AppError("Falha ao resolver fatura", 500)
    return invoice
}

// Lançamento novo/alterado não pode cair numa fatura já paga (o valor pago ficaria inconsistente).
export const assertInvoiceWritable = (invoice: Invoice) => {
    if (invoice.status === "paid") {
        throw new AppError(`A fatura ${invoice.referenceMonth} já foi paga e não aceita alterações`, 409)
    }
}

export const findOwnedInvoice = async (userId: string, invoiceId: string, executor: DbOrTx = db) => {
    const invoice = await executor.query.invoices.findFirst({
        where: and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)),
    })
    if (!invoice) throw new AppError("Fatura não encontrada", 404)
    return invoice
}

export const computeInvoiceTotals = async (invoiceIds: string[], executor: DbOrTx = db) => {
    if (invoiceIds.length === 0) return new Map<string, number>()
    const rows = await executor
        .select({ invoiceId: transactions.invoiceId, total: signedCardAmount })
        .from(transactions)
        .where(inArray(transactions.invoiceId, invoiceIds))
        .groupBy(transactions.invoiceId)
    return new Map(rows.map((row) => [row.invoiceId!, row.total]))
}

const withTotals = async (rows: Invoice[]) => {
    const totals = await computeInvoiceTotals(rows.map((row) => row.id))
    return rows.map((row) => ({ ...row, totalCents: totals.get(row.id) ?? 0 }))
}

export const listInvoices = async (userId: string, query: InvoiceQuery) => {
    const rows = await db.query.invoices.findMany({
        where: and(
            eq(invoices.userId, userId),
            query.creditCardId ? eq(invoices.creditCardId, query.creditCardId) : undefined,
            query.status ? eq(invoices.status, query.status) : undefined,
        ),
        orderBy: (table, { desc }) => [desc(table.dueDate)],
    })
    return withTotals(rows)
}

export const getInvoice = async (userId: string, invoiceId: string) => {
    const invoice = await findOwnedInvoice(userId, invoiceId)
    const [withTotal] = await withTotals([invoice])
    const items = await db.query.transactions.findMany({
        where: eq(transactions.invoiceId, invoiceId),
        orderBy: (table, { asc }) => [asc(table.date), asc(table.createdAt)],
    })
    return { ...withTotal!, transactions: items }
}

export const payInvoice = async (userId: string, invoiceId: string, input: PayInvoiceInput) => {
    const invoice = await findOwnedInvoice(userId, invoiceId)
    if (invoice.status === "paid") throw new AppError("Fatura já está paga", 409)

    const creditCard = await findOwnedCreditCard(userId, invoice.creditCardId)
    const accountId = input.accountId ?? creditCard.paymentAccountId
    if (!accountId) throw new AppError("Informe a conta de pagamento (o cartão não tem conta padrão)", 400)
    await findOwnedAccount(userId, accountId)

    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date()

    const paid = await db.transaction(async (tx) => {
        const totals = await computeInvoiceTotals([invoiceId], tx)
        const totalCents = totals.get(invoiceId) ?? 0

        const [updated] = await tx
            .update(invoices)
            .set({ status: "paid", paidAt, paidAmountCents: totalCents, paidFromAccountId: accountId })
            .where(eq(invoices.id, invoiceId))
            .returning()

        await tx.update(transactions).set({ status: "paid", paidAt }).where(eq(transactions.invoiceId, invoiceId))

        return { ...updated!, totalCents }
    })

    return paid
}
