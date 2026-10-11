// Regras de cartões: CRUD escopado por usuário + cálculo de limite usado/disponível.
import { and, eq, inArray, ne, sql } from "drizzle-orm"
import { creditCards, invoices, transactions } from "../../db/schema"
import { cached } from "../../lib/cache"
import { type DbOrTx, db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import { findOwnedAccount } from "../accounts/accounts.service"
import type { CreateCreditCardInput, UpdateCreditCardInput } from "./schemas/credit-card.schema"

type CreditCardRow = typeof creditCards.$inferSelect

export const findOwnedCreditCard = async (userId: string, creditCardId: string, executor: DbOrTx = db) => {
    const creditCard = await executor.query.creditCards.findFirst({
        where: and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId)),
    })
    if (!creditCard) throw new AppError("Cartão não encontrado", 404)
    return creditCard
}

// Estorno (income no cartão) abate do total, por isso o sinal invertido.
export const signedCardAmount = sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountCents} else -${transactions.amountCents} end), 0)::int`

const withLimits = async (rows: CreditCardRow[]) => {
    if (rows.length === 0) return []
    const used = await db
        .select({ creditCardId: transactions.creditCardId, total: signedCardAmount })
        .from(transactions)
        .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
        .where(
            and(
                inArray(
                    transactions.creditCardId,
                    rows.map((row) => row.id),
                ),
                ne(invoices.status, "paid"),
            ),
        )
        .groupBy(transactions.creditCardId)

    const usedByCard = new Map(used.map((row) => [row.creditCardId, row.total]))
    return rows.map((row) => {
        const usedLimitCents = usedByCard.get(row.id) ?? 0
        return { ...row, usedLimitCents, availableLimitCents: row.limitCents - usedLimitCents }
    })
}

export const listCreditCards = (userId: string) =>
    cached(userId, "credit-cards", "all", async () => {
        const rows = await db.query.creditCards.findMany({
            where: eq(creditCards.userId, userId),
            orderBy: (table, { asc }) => [asc(table.name)],
        })
        return withLimits(rows)
    })

export const getCreditCard = (userId: string, creditCardId: string) =>
    cached(userId, "credit-card", creditCardId, async () => {
        const [creditCard] = await withLimits([await findOwnedCreditCard(userId, creditCardId)])
        return creditCard!
    })

export const createCreditCard = async (userId: string, input: CreateCreditCardInput) => {
    if (input.paymentAccountId) await findOwnedAccount(userId, input.paymentAccountId)
    const [creditCard] = await db
        .insert(creditCards)
        .values({ ...input, userId })
        .returning()
    return { ...creditCard!, usedLimitCents: 0, availableLimitCents: creditCard!.limitCents }
}

export const updateCreditCard = async (userId: string, creditCardId: string, input: UpdateCreditCardInput) => {
    await findOwnedCreditCard(userId, creditCardId)
    if (input.paymentAccountId) await findOwnedAccount(userId, input.paymentAccountId)

    const [creditCard] = await db
        .update(creditCards)
        .set(input)
        .where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId)))
        .returning()
    const [result] = await withLimits([creditCard!])
    return result!
}

export const deleteCreditCard = async (userId: string, creditCardId: string) => {
    await findOwnedCreditCard(userId, creditCardId)
    const used = await db.query.transactions.findFirst({
        where: eq(transactions.creditCardId, creditCardId),
        columns: { id: true },
    })
    if (used) throw new AppError("Cartão possui lançamentos e não pode ser excluído", 409)

    // Faturas vazias e recorrências do cartão saem junto via cascade.
    await db.delete(creditCards).where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId)))
}
