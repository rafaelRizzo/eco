// Regras de contas: saldo = inicial + receitas pagas - despesas pagas - faturas pagas a partir da conta.
// Leituras passam pelo cache Redis opcional (lib/cache.ts); sem REDIS_URL vão direto pro Postgres.
import { and, eq, inArray, sql } from "drizzle-orm"
import { accounts, invoices, transactions } from "../../db/schema"
import { cached } from "../../lib/cache"
import { type DbOrTx, db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import type { CreateAccountInput, UpdateAccountInput } from "./schemas/account.schema"

type AccountRow = typeof accounts.$inferSelect

export const findOwnedAccount = async (userId: string, accountId: string, executor: DbOrTx = db) => {
    const account = await executor.query.accounts.findFirst({
        where: and(eq(accounts.id, accountId), eq(accounts.userId, userId)),
    })
    if (!account) throw new AppError("Conta não encontrada", 404)
    return account
}

const computeBalances = async (rows: AccountRow[]) => {
    if (rows.length === 0) return []
    const ids = rows.map((row) => row.id)

    const [movements, invoicePayments] = await Promise.all([
        db
            .select({
                accountId: transactions.accountId,
                total: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else -${transactions.amountCents} end), 0)::int`,
            })
            .from(transactions)
            .where(and(inArray(transactions.accountId, ids), eq(transactions.status, "paid")))
            .groupBy(transactions.accountId),
        db
            .select({
                accountId: invoices.paidFromAccountId,
                total: sql<number>`coalesce(sum(${invoices.paidAmountCents}), 0)::int`,
            })
            .from(invoices)
            .where(and(inArray(invoices.paidFromAccountId, ids), eq(invoices.status, "paid")))
            .groupBy(invoices.paidFromAccountId),
    ])

    const movementByAccount = new Map(movements.map((row) => [row.accountId, row.total]))
    const paymentsByAccount = new Map(invoicePayments.map((row) => [row.accountId, row.total]))

    return rows.map((row) => ({
        ...row,
        balanceCents:
            row.initialBalanceCents + (movementByAccount.get(row.id) ?? 0) - (paymentsByAccount.get(row.id) ?? 0),
    }))
}

const withBalance = async (row: AccountRow) => {
    const [result] = await computeBalances([row])
    return result!
}

export const listAccounts = (userId: string) =>
    cached(userId, "accounts", "all", async () => {
        const rows = await db.query.accounts.findMany({
            where: eq(accounts.userId, userId),
            orderBy: (table, { asc }) => [asc(table.name)],
        })
        return computeBalances(rows)
    })

export const getAccount = (userId: string, accountId: string) =>
    cached(userId, "account", accountId, async () => withBalance(await findOwnedAccount(userId, accountId)))

export const createAccount = async (userId: string, input: CreateAccountInput) => {
    const [account] = await db
        .insert(accounts)
        .values({ ...input, userId })
        .returning()
    return { ...account!, balanceCents: account!.initialBalanceCents }
}

export const updateAccount = async (userId: string, accountId: string, input: UpdateAccountInput) => {
    await findOwnedAccount(userId, accountId)
    const [account] = await db
        .update(accounts)
        .set(input)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .returning()
    return withBalance(account!)
}

export const deleteAccount = async (userId: string, accountId: string) => {
    await findOwnedAccount(userId, accountId)
    const used = await db.query.transactions.findFirst({
        where: eq(transactions.accountId, accountId),
        columns: { id: true },
    })
    if (used) throw new AppError("Conta possui lançamentos e não pode ser excluída", 409)

    await db.delete(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
}
