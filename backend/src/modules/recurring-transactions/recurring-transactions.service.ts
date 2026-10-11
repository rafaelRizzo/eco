// Regras de recorrências: CRUD + geração idempotente das ocorrências (chamada pelo cron).
import { and, eq } from "drizzle-orm"
import { type RecurringTransaction, recurringTransactions, transactions } from "../../db/schema"
import { env } from "../../env"
import { nextOccurrence } from "../../lib/billing"
import { addDays, parseDate, todayIn } from "../../lib/dates"
import { cached } from "../../lib/cache"
import { db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import { logger } from "../../lib/logger"
import { findOwnedAccount } from "../accounts/accounts.service"
import { assertCategoryMatchesType } from "../categories/categories.service"
import { findOwnedCreditCard } from "../credit-cards/credit-cards.service"
import { insertCardTransaction } from "../transactions/transactions.service"
import type {
    CreateRecurringTransactionInput,
    RecurringTransactionQuery,
    UpdateRecurringTransactionInput,
} from "./schemas/recurring-transaction.schema"

export const findOwnedRecurringTransaction = async (userId: string, recurringId: string) => {
    const recurring = await db.query.recurringTransactions.findFirst({
        where: and(eq(recurringTransactions.id, recurringId), eq(recurringTransactions.userId, userId)),
    })
    if (!recurring) throw new AppError("Recorrência não encontrada", 404)
    return recurring
}

// Primeira ocorrência >= hoje, pra reativação não gerar de uma vez todos os meses que ficou pausada.
const fastForward = (recurring: RecurringTransaction, today: string) => {
    let next = recurring.nextRunDate
    while (next < today) next = nextOccurrence(next, recurring.frequency, recurring.anchorDay)
    return next
}

export const listRecurringTransactions = (userId: string, query: RecurringTransactionQuery) =>
    cached(userId, "recurring-transactions", JSON.stringify(query), () =>
        db.query.recurringTransactions.findMany({
            where: and(
                eq(recurringTransactions.userId, userId),
                query.active !== undefined ? eq(recurringTransactions.active, query.active) : undefined,
            ),
            orderBy: (table, { asc }) => [asc(table.nextRunDate)],
        }),
    )

export const getRecurringTransaction = (userId: string, id: string) =>
    cached(userId, "recurring-transaction", id, () => findOwnedRecurringTransaction(userId, id))

export const createRecurringTransaction = async (userId: string, input: CreateRecurringTransactionInput) => {
    await assertCategoryMatchesType(userId, input.categoryId, input.type)
    if (input.accountId) await findOwnedAccount(userId, input.accountId)
    if (input.creditCardId) await findOwnedCreditCard(userId, input.creditCardId)

    const [recurring] = await db
        .insert(recurringTransactions)
        .values({
            ...input,
            userId,
            categoryId: input.categoryId ?? null,
            endDate: input.endDate ?? null,
            anchorDay: parseDate(input.startDate).day,
            nextRunDate: input.startDate,
        })
        .returning()

    // Gera já o que estiver dentro da janela, sem esperar o próximo cron; o cron cobre o resto.
    const today = todayIn(env.APP_TIMEZONE)
    await generateDueOccurrences(recurring!, horizonFrom(today), today)
    return findOwnedRecurringTransaction(userId, recurring!.id)
}

export const updateRecurringTransaction = async (
    userId: string,
    recurringId: string,
    input: UpdateRecurringTransactionInput,
) => {
    const current = await findOwnedRecurringTransaction(userId, recurringId)
    if (input.categoryId !== undefined) await assertCategoryMatchesType(userId, input.categoryId, current.type)

    const changes: Partial<RecurringTransaction> = { ...input }
    if (input.active && !current.active) changes.nextRunDate = fastForward(current, todayIn(env.APP_TIMEZONE))

    const [recurring] = await db
        .update(recurringTransactions)
        .set(changes)
        .where(and(eq(recurringTransactions.id, recurringId), eq(recurringTransactions.userId, userId)))
        .returning()
    return recurring!
}

// Lançamentos já gerados ficam (recurring_transaction_id vira null).
export const deleteRecurringTransaction = async (userId: string, recurringId: string) => {
    await findOwnedRecurringTransaction(userId, recurringId)
    await db
        .delete(recurringTransactions)
        .where(and(eq(recurringTransactions.id, recurringId), eq(recurringTransactions.userId, userId)))
}

// Gera todas as ocorrências com vencimento até `horizon` (inclui atrasadas, se o servidor ficou fora do ar).
// Cada ocorrência roda numa transaction que primeiro "reserva" a data via update condicional em next_run_date:
// se outra execução já avançou, o update não afeta linha e a ocorrência é pulada (sem duplicar lançamento).
export const generateDueOccurrences = async (recurring: RecurringTransaction, horizon: string, today: string) => {
    let generated = 0
    let current = recurring

    while (current.active && current.nextRunDate <= horizon) {
        if (current.endDate && current.nextRunDate > current.endDate) break

        const occurrenceDate = current.nextRunDate
        const next = nextOccurrence(occurrenceDate, current.frequency, current.anchorDay)

        const advanced = await db.transaction(async (tx) => {
            const [claimed] = await tx
                .update(recurringTransactions)
                .set({ nextRunDate: next, lastRunDate: occurrenceDate })
                .where(
                    and(
                        eq(recurringTransactions.id, current.id),
                        eq(recurringTransactions.nextRunDate, occurrenceDate),
                    ),
                )
                .returning()
            if (!claimed) return null

            const values = {
                userId: current.userId,
                type: current.type,
                description: current.description,
                amountCents: current.amountCents,
                date: occurrenceDate,
                categoryId: current.categoryId,
                recurringTransactionId: current.id,
            }

            if (current.creditCardId) {
                const creditCard = await findOwnedCreditCard(current.userId, current.creditCardId, tx)
                try {
                    await insertCardTransaction(tx, creditCard, values)
                } catch (error) {
                    // Fatura do ciclo já paga: pula a ocorrência em vez de travar a recorrência pra sempre.
                    if (!(error instanceof AppError)) throw error
                    logger.warn({ event: "recurring_occurrence_skipped", recurringId: current.id, reason: error.message })
                    return claimed
                }
            } else {
                const paid = current.autoPay && occurrenceDate <= today
                await tx
                    .insert(transactions)
                    .values({
                        ...values,
                        accountId: current.accountId,
                        status: paid ? "paid" : "pending",
                        paidAt: paid ? new Date() : null,
                    })
                    .onConflictDoNothing({ target: [transactions.recurringTransactionId, transactions.date] })
            }

            generated++
            return claimed
        })

        if (!advanced) break
        current = advanced
    }

    if (current.endDate && current.nextRunDate > current.endDate && current.active) {
        await db
            .update(recurringTransactions)
            .set({ active: false })
            .where(eq(recurringTransactions.id, current.id))
    }

    return generated
}

export const horizonFrom = (today: string) => addDays(today, env.RECURRING_LEAD_DAYS)
