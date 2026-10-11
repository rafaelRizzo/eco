// Regras de proventos: recebido (pagamento até hoje), a receber (lançado) e estimado (pela recorrência do ativo).
import { and, between, eq } from "drizzle-orm"
import { dividends, transactions } from "../../db/schema"
import { type DbOrTx, db } from "../../lib/db"
import { addMonths, monthRange, parseDate, shiftMonth, toMonthKey, todayIn } from "../../lib/dates"
import { AppError } from "../../lib/errors"
import { projectDividends } from "../../lib/investments"
import { env } from "../../env"
import { findOwnedAccount } from "../accounts/accounts.service"
import { findOwnedAsset, listAssetViews } from "../assets/assets.service"
import type { CreateDividendInput, UpdateDividendInput } from "./schemas/dividend.schema"

type DividendRow = typeof dividends.$inferSelect
type Status = "received" | "pending" | "estimated"
type Item = {
    id: string
    assetId: string
    ticker: string
    assetName: string
    kind: DividendRow["kind"]
    quantity: number
    amountPerUnit: number
    totalCents: number
    comDate: string | null
    payDate: string
    transactionId: string | null
    status: Status
}
type AssetInfo = { ticker: string; name: string; class?: string }

const round6 = (value: number) => Math.round(value * 1e6) / 1e6

// Registros antigos não têm valor por cota gravado: deriva do total / cotas.
const perUnitOf = (row: DividendRow) =>
    row.amountPerUnit === null ? round6(row.totalCents / Number(row.quantity) / 100) : Number(row.amountPerUnit)

// Valor por cota manda quando informado (total = cota × quantidade); senão o total manda e a cota é derivada.
const resolveAmounts = (units: number, input: { amountPerUnit?: number; totalCents?: number }) => {
    if (input.amountPerUnit !== undefined) {
        const totalCents = Math.round(input.amountPerUnit * units * 100)
        if (totalCents <= 0) throw new AppError("O total do provento ficou menor que R$ 0,01", 400)
        return { amountPerUnit: input.amountPerUnit, totalCents }
    }
    const totalCents = input.totalCents!
    return { amountPerUnit: round6(totalCents / units / 100), totalCents }
}

// due*: estimados cuja data já chegou e aguardam o usuário confirmar o recebimento (valor real + conta).
const emptyTotals = () => ({
    totalCents: 0,
    receivedCents: 0,
    pendingCents: 0,
    estimatedCents: 0,
    dueCents: 0,
    dueCount: 0,
})

const sumItems = (items: Item[], today: string) => {
    const totals = emptyTotals()
    for (const item of items) {
        totals.totalCents += item.totalCents
        if (item.status === "received") totals.receivedCents += item.totalCents
        else if (item.status === "pending") totals.pendingCents += item.totalCents
        else {
            totals.estimatedCents += item.totalCents
            if (item.payDate <= today) {
                totals.dueCents += item.totalCents
                totals.dueCount += 1
            }
        }
    }
    return totals
}

const toItem = (row: DividendRow, asset: AssetInfo, today: string): Item => ({
    id: row.id,
    assetId: row.assetId,
    ticker: asset.ticker,
    assetName: asset.name,
    kind: row.kind,
    quantity: Number(row.quantity),
    amountPerUnit: perUnitOf(row),
    totalCents: row.totalCents,
    comDate: row.comDate,
    payDate: row.payDate,
    transactionId: row.transactionId,
    // Creditado em conta conta como recebido mesmo com data futura (o usuário confirmou).
    status: row.transactionId !== null || row.payDate <= today ? "received" : "pending",
})

const monthKeyFrom = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`

// Uma ida ao banco cobre todos os meses pedidos; a janela começa 26 meses antes de hoje pra achar o último provento (mesmo de ativo anual).
const computeMonths = async (userId: string, monthKeys: string[], today: string) => {
    const lower = [monthRange(monthKeys[0]!).start, addMonths(today, -26)].sort()[0]!
    const upper = monthRange(monthKeys[monthKeys.length - 1]!).end

    const [rows, views] = await Promise.all([
        db
            .select()
            .from(dividends)
            .where(and(eq(dividends.userId, userId), between(dividends.payDate, lower, upper))),
        listAssetViews(userId),
    ])
    const assetById = new Map<string, AssetInfo>(views.map((view) => [view.id, { ticker: view.ticker, name: view.name, class: view.class }]))

    const estimates = projectDividends(
        views.map((view) => ({
            id: view.id,
            frequency: view.dividendFrequency,
            quantity: view.quantity,
            expectedUnitCents: view.dividendPerUnit === null ? null : view.dividendPerUnit * 100,
            nextDate: view.nextDividendDate,
        })),
        rows.map((row) => ({
            assetId: row.assetId,
            payDate: row.payDate,
            totalCents: row.totalCents,
            quantity: Number(row.quantity),
            unitCents: perUnitOf(row) * 100,
        })),
        monthKeys,
        today,
    )

    return monthKeys.map((month) => {
        const recorded = rows
            .filter((row) => toMonthKey(row.payDate) === month)
            .map((row) => toItem(row, assetById.get(row.assetId)!, today))
        const estimated = estimates
            .filter((estimate) => toMonthKey(estimate.payDate) === month)
            .map<Item>((estimate) => ({
                id: `estimated:${estimate.assetId}:${month}`,
                assetId: estimate.assetId,
                ticker: assetById.get(estimate.assetId)!.ticker,
                assetName: assetById.get(estimate.assetId)!.name,
                kind: assetById.get(estimate.assetId)!.class === "reit" ? "yield" : "dividend",
                quantity: estimate.quantity,
                amountPerUnit: round6(estimate.unitCents / 100),
                totalCents: estimate.totalCents,
                comDate: null,
                payDate: estimate.payDate,
                transactionId: null,
                status: "estimated",
            }))
        const items = [...recorded, ...estimated].sort((a, b) => a.payDate.localeCompare(b.payDate))
        return { month, items, totals: sumItems(items, today) }
    })
}

export const listMonth = async (userId: string, month?: string) => {
    const today = todayIn(env.APP_TIMEZONE)
    const key = month ?? toMonthKey(today)
    const [result] = await computeMonths(userId, [key], today)
    return { month: key, dividends: result!.items, totals: result!.totals }
}

// Resumo do mês atual em diante (cards "Este mês" / "Próximo mês").
export const listUpcoming = async (userId: string, months: number) => {
    const today = todayIn(env.APP_TIMEZONE)
    const { year, month } = parseDate(today)
    const keys = Array.from({ length: months }, (_, index) => {
        const target = shiftMonth(year, month, index)
        return monthKeyFrom(target.year, target.month)
    })
    const result = await computeMonths(userId, keys, today)
    return result.map(({ month: key, totals }) => ({ month: key, ...totals }))
}

const findOwnedDividend = async (userId: string, dividendId: string) => {
    const dividend = await db.query.dividends.findFirst({
        where: and(eq(dividends.id, dividendId), eq(dividends.userId, userId)),
    })
    if (!dividend) throw new AppError("Provento não encontrado", 404)
    return dividend
}

const kindLabels: Record<DividendRow["kind"], string> = {
    dividend: "Dividendo",
    jcp: "JCP",
    yield: "Rendimento",
    other: "Provento",
}

const creditDescription = (row: DividendRow, ticker: string) => `${kindLabels[row.kind]} ${ticker}`

// Cria a receita paga na conta (entra em "Entradas" e no saldo) e liga ao provento.
const creditToAccount = async (tx: DbOrTx, userId: string, accountId: string, row: DividendRow, ticker: string) => {
    await findOwnedAccount(userId, accountId, tx)
    const [created] = await tx
        .insert(transactions)
        .values({
            userId,
            type: "income",
            status: "paid",
            description: creditDescription(row, ticker),
            amountCents: row.totalCents,
            date: row.payDate,
            accountId,
            paidAt: new Date(),
            notes: "Provento recebido",
        })
        .returning({ id: transactions.id })
    const [linked] = await tx
        .update(dividends)
        .set({ transactionId: created!.id })
        .where(and(eq(dividends.id, row.id), eq(dividends.userId, userId)))
        .returning()
    return linked!
}

export const createDividend = async (userId: string, input: CreateDividendInput) => {
    const asset = await findOwnedAsset(userId, input.assetId)
    let units = input.quantity
    if (units === undefined) {
        const [view] = await listAssetViews(userId, asset.id)
        units = view?.quantity ?? 0
        if (units <= 0) throw new AppError("Informe a quantidade de cotas: não há posição em carteira", 400)
    }
    const { amountPerUnit, totalCents } = resolveAmounts(units, input)

    const row = await db.transaction(async (tx) => {
        const [created] = await tx
            .insert(dividends)
            .values({
                userId,
                assetId: input.assetId,
                kind: input.kind,
                comDate: input.comDate ?? null,
                payDate: input.payDate,
                quantity: String(units),
                amountPerUnit: amountPerUnit.toFixed(6),
                totalCents,
            })
            .returning()
        return input.accountId ? creditToAccount(tx, userId, input.accountId, created!, asset.ticker) : created!
    })
    return toItem(row, asset, todayIn(env.APP_TIMEZONE))
}

export const updateDividend = async (userId: string, dividendId: string, input: UpdateDividendInput) => {
    const current = await findOwnedDividend(userId, dividendId)
    const asset = await findOwnedAsset(userId, input.assetId ?? current.assetId)

    // O refine do Zod só enxerga o body; aqui a checagem considera o valor já gravado.
    const comDate = input.comDate === undefined ? current.comDate : input.comDate
    const payDate = input.payDate ?? current.payDate
    if (comDate && comDate > payDate) throw new AppError("A data com não pode ser depois da data de pagamento", 400)

    const units = input.quantity ?? Number(current.quantity)
    const changesAmount = input.amountPerUnit !== undefined || input.totalCents !== undefined
    // Só mudou a quantidade: mantém o valor por cota e recalcula o total.
    const amounts =
        changesAmount || input.quantity !== undefined
            ? resolveAmounts(units, changesAmount ? input : { amountPerUnit: perUnitOf(current) })
            : null

    const row = await db.transaction(async (tx) => {
        const [updated] = await tx
            .update(dividends)
            .set({
                ...(input.assetId === undefined ? {} : { assetId: input.assetId }),
                ...(input.kind === undefined ? {} : { kind: input.kind }),
                ...(input.comDate === undefined ? {} : { comDate: input.comDate }),
                ...(input.payDate === undefined ? {} : { payDate: input.payDate }),
                ...(amounts
                    ? {
                          quantity: String(units),
                          amountPerUnit: amounts.amountPerUnit.toFixed(6),
                          totalCents: amounts.totalCents,
                      }
                    : {}),
            })
            .where(and(eq(dividends.id, dividendId), eq(dividends.userId, userId)))
            .returning()

        if (updated!.transactionId === null) {
            return input.accountId ? creditToAccount(tx, userId, input.accountId, updated!, asset.ticker) : updated!
        }
        // Já creditado: a receita acompanha valor, data, descrição e (se informada) a conta.
        if (input.accountId) await findOwnedAccount(userId, input.accountId, tx)
        await tx
            .update(transactions)
            .set({
                amountCents: updated!.totalCents,
                date: updated!.payDate,
                description: creditDescription(updated!, asset.ticker),
                ...(input.accountId ? { accountId: input.accountId } : {}),
            })
            .where(and(eq(transactions.id, updated!.transactionId), eq(transactions.userId, userId)))
        return updated!
    })
    return toItem(row, asset, todayIn(env.APP_TIMEZONE))
}

// Apagar um provento creditado remove também a receita que ele gerou (senão o saldo ficaria com dinheiro fantasma).
export const deleteDividend = async (userId: string, dividendId: string) => {
    const dividend = await findOwnedDividend(userId, dividendId)
    await db.transaction(async (tx) => {
        await tx.delete(dividends).where(and(eq(dividends.id, dividendId), eq(dividends.userId, userId)))
        if (dividend.transactionId) {
            await tx
                .delete(transactions)
                .where(and(eq(transactions.id, dividend.transactionId), eq(transactions.userId, userId)))
        }
    })
}
