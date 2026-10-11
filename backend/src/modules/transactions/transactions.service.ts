// Regras de lançamentos: conta (pago/pendente) ou cartão (vinculado à fatura do ciclo, com parcelamento).
import { createId } from "@paralleldrive/cuid2"
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm"
import { type CreditCard, transactions } from "../../db/schema"
import { env } from "../../env"
import { splitInstallments } from "../../lib/billing"
import { addMonths, monthRange, parseDate, todayIn } from "../../lib/dates"
import { type DbOrTx, db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import { findOwnedAccount } from "../accounts/accounts.service"
import { assertCategoryMatchesType } from "../categories/categories.service"
import { findOwnedCreditCard } from "../credit-cards/credit-cards.service"
import {
    assertInvoiceWritable,
    findOwnedInvoice,
    getOrCreateInvoiceForDate,
} from "../invoices/invoices.service"
import type {
    CreateTransactionInput,
    DeleteTransactionQuery,
    PayTransactionInput,
    TransactionQuery,
    UpdateTransactionInput,
} from "./schemas/transaction.schema"

type NewTransaction = typeof transactions.$inferInsert

export const findOwnedTransaction = async (userId: string, transactionId: string, executor: DbOrTx = db) => {
    const transaction = await executor.query.transactions.findFirst({
        where: and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
    })
    if (!transaction) throw new AppError("Lançamento não encontrado", 404)
    return transaction
}

// Insere um lançamento de cartão já vinculado à fatura do ciclo da data (usado também pelo cron de recorrência).
export const insertCardTransaction = async (
    executor: DbOrTx,
    creditCard: CreditCard,
    values: Omit<NewTransaction, "creditCardId" | "invoiceId" | "accountId" | "status" | "paidAt">,
) => {
    const invoice = await getOrCreateInvoiceForDate(executor, creditCard, values.date)
    assertInvoiceWritable(invoice)
    const [created] = await executor
        .insert(transactions)
        .values({ ...values, creditCardId: creditCard.id, invoiceId: invoice.id, status: "pending" })
        .returning()
    return created!
}

export const listTransactions = (userId: string, query: TransactionQuery) => {
    const range = query.month ? monthRange(query.month) : { start: query.from, end: query.to }

    return db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, userId),
            range.start ? gte(transactions.date, range.start) : undefined,
            range.end ? lte(transactions.date, range.end) : undefined,
            query.type ? eq(transactions.type, query.type) : undefined,
            query.status ? eq(transactions.status, query.status) : undefined,
            query.categoryId ? eq(transactions.categoryId, query.categoryId) : undefined,
            query.accountId ? eq(transactions.accountId, query.accountId) : undefined,
            query.creditCardId ? eq(transactions.creditCardId, query.creditCardId) : undefined,
            query.invoiceId ? eq(transactions.invoiceId, query.invoiceId) : undefined,
        ),
        orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    })
}

export const getTransaction = (userId: string, transactionId: string) => findOwnedTransaction(userId, transactionId)

export const createTransaction = async (userId: string, input: CreateTransactionInput) => {
    await assertCategoryMatchesType(userId, input.categoryId, input.type)

    const base = {
        userId,
        type: input.type,
        description: input.description,
        categoryId: input.categoryId ?? null,
        notes: input.notes ?? null,
    }

    if (input.accountId) {
        await findOwnedAccount(userId, input.accountId)
        // Sem status explícito: data passada/hoje = já pago, data futura = conta a pagar/receber.
        const status = input.status ?? (input.date <= todayIn(env.APP_TIMEZONE) ? "paid" : "pending")
        const [created] = await db
            .insert(transactions)
            .values({
                ...base,
                amountCents: input.amountCents,
                date: input.date,
                accountId: input.accountId,
                status,
                paidAt: status === "paid" ? new Date() : null,
            })
            .returning()
        return [created!]
    }

    const creditCard = await findOwnedCreditCard(userId, input.creditCardId!)
    const amounts = splitInstallments(input.amountCents, input.installments)
    const isInstallment = input.installments > 1
    const installmentGroupId = isInstallment ? createId() : null
    const anchorDay = parseDate(input.date).day

    return db.transaction(async (tx) => {
        const created = []
        for (const [index, amountCents] of amounts.entries()) {
            created.push(
                await insertCardTransaction(tx, creditCard, {
                    ...base,
                    amountCents,
                    // Parcela N cai N meses depois, mantendo o dia da compra.
                    date: addMonths(input.date, index, anchorDay),
                    installmentGroupId,
                    installmentNumber: isInstallment ? index + 1 : null,
                    installmentTotal: isInstallment ? input.installments : null,
                }),
            )
        }
        return created
    })
}

export const updateTransaction = async (userId: string, transactionId: string, input: UpdateTransactionInput) => {
    const current = await findOwnedTransaction(userId, transactionId)
    if (input.categoryId !== undefined) await assertCategoryMatchesType(userId, input.categoryId, current.type)

    return db.transaction(async (tx) => {
        const changes: Partial<NewTransaction> = { ...input }

        if (current.invoiceId) {
            const invoice = await findOwnedInvoice(userId, current.invoiceId, tx)
            const touchesInvoice = input.amountCents !== undefined || input.date !== undefined
            if (touchesInvoice) assertInvoiceWritable(invoice)

            // Data nova pode cair em outro ciclo: re-resolve a fatura.
            if (input.date && input.date !== current.date) {
                const creditCard = await findOwnedCreditCard(userId, current.creditCardId!, tx)
                const target = await getOrCreateInvoiceForDate(tx, creditCard, input.date)
                assertInvoiceWritable(target)
                changes.invoiceId = target.id
            }
        } else if (input.date && current.status === "overdue" && input.date >= todayIn(env.APP_TIMEZONE)) {
            // Vencimento adiado: deixa de estar atrasado.
            changes.status = "pending"
        }

        const [updated] = await tx
            .update(transactions)
            .set(changes)
            .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
            .returning()
        return updated!
    })
}

export const payTransaction = async (userId: string, transactionId: string, input: PayTransactionInput) => {
    const current = await findOwnedTransaction(userId, transactionId)
    if (current.creditCardId) throw new AppError("Lançamento de cartão é quitado pelo pagamento da fatura", 400)
    if (current.status === "paid") throw new AppError("Lançamento já está pago", 409)

    const [updated] = await db
        .update(transactions)
        .set({ status: "paid", paidAt: input.paidAt ? new Date(input.paidAt) : new Date() })
        .where(eq(transactions.id, transactionId))
        .returning()
    return updated!
}

export const deleteTransaction = async (userId: string, transactionId: string, query: DeleteTransactionQuery) => {
    const current = await findOwnedTransaction(userId, transactionId)

    const targets =
        query.scope === "installments" && current.installmentGroupId
            ? await db.query.transactions.findMany({
                  where: and(
                      eq(transactions.userId, userId),
                      eq(transactions.installmentGroupId, current.installmentGroupId),
                  ),
              })
            : [current]

    const invoiceIds = [...new Set(targets.map((target) => target.invoiceId).filter((id): id is string => !!id))]
    for (const invoiceId of invoiceIds) assertInvoiceWritable(await findOwnedInvoice(userId, invoiceId))

    await db.delete(transactions).where(
        and(
            eq(transactions.userId, userId),
            inArray(
                transactions.id,
                targets.map((target) => target.id),
            ),
        ),
    )
    return targets.length
}
