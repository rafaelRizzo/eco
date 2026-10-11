// Regras de ativos: posição e preço médio vêm das operações (asset_trades), calculados na leitura.
import { and, asc, count, eq, inArray } from "drizzle-orm"
import { assetTrades, assets, dividends, transactions } from "../../db/schema"
import { cached } from "../../lib/cache"
import { type DbOrTx, db } from "../../lib/db"
import { env } from "../../env"
import { todayIn } from "../../lib/dates"
import { AppError } from "../../lib/errors"
import { computePosition, summarizePortfolio, type TradeLike, valuePosition } from "../../lib/investments"
import type { CreateAssetInput, UpdateAssetInput } from "./schemas/asset.schema"

type AssetRow = typeof assets.$inferSelect
type TradeRow = typeof assetTrades.$inferSelect

export const findOwnedAsset = async (userId: string, assetId: string, executor: DbOrTx = db) => {
    const asset = await executor.query.assets.findFirst({
        where: and(eq(assets.id, assetId), eq(assets.userId, userId)),
    })
    if (!asset) throw new AppError("Ativo não encontrado", 404)
    return asset
}

export const toTradeLike = (row: TradeRow): TradeLike => ({
    type: row.type,
    quantity: Number(row.quantity),
    unitPriceCents: row.unitPriceCents,
    feesCents: row.feesCents,
    tradedAt: row.tradedAt,
    createdAt: row.createdAt,
})

const toView = (asset: AssetRow, trades: TradeLike[]) => {
    const position = computePosition(trades)
    return {
        id: asset.id,
        ticker: asset.ticker,
        name: asset.name,
        class: asset.class,
        dividendFrequency: asset.dividendFrequency,
        dividendPerUnit: asset.dividendPerUnit === null ? null : Number(asset.dividendPerUnit),
        nextDividendDate: asset.nextDividendDate,
        currentPriceCents: asset.currentPriceCents,
        priceUpdatedAt: asset.priceUpdatedAt,
        ...position,
        ...valuePosition(position, asset.currentPriceCents),
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
    }
}

// Carrega ativos do usuário (ou só um) já com posição e avaliação.
export const listAssetViews = async (userId: string, assetId?: string, executor: DbOrTx = db) => {
    const scope = assetId ? eq(assets.id, assetId) : undefined
    const rows = await executor
        .select()
        .from(assets)
        .where(and(eq(assets.userId, userId), scope))
        .orderBy(asc(assets.ticker))
    if (rows.length === 0) return []

    const tradeScope = assetId ? eq(assetTrades.assetId, assetId) : undefined
    const trades = await executor
        .select()
        .from(assetTrades)
        .where(and(eq(assetTrades.userId, userId), tradeScope))
    const byAsset = new Map<string, TradeLike[]>()
    for (const trade of trades) {
        byAsset.set(trade.assetId, [...(byAsset.get(trade.assetId) ?? []), toTradeLike(trade)])
    }
    return rows.map((row) => toView(row, byAsset.get(row.id) ?? []))
}

export const listAssets = (userId: string) =>
    cached(userId, "assets", "all", async () => {
        const views = await listAssetViews(userId)
        return { assets: views, summary: summarizePortfolio(views) }
    })

const getAssetView = async (userId: string, assetId: string) => {
    const [view] = await listAssetViews(userId, assetId)
    if (!view) throw new AppError("Ativo não encontrado", 404)
    return view
}

// numeric do Postgres trafega como string; null limpa o campo, undefined não mexe.
const perUnitColumn = (value: number | null | undefined) =>
    value === undefined ? {} : { dividendPerUnit: value === null ? null : value.toFixed(6) }

export const createAsset = async (userId: string, input: CreateAssetInput) => {
    const { currentPriceCents = null, dividendPerUnit, name, initialQuantity, initialAvgPriceCents, ...rest } = input
    const dividendFrequency = rest.dividendFrequency ?? (rest.class === "reit" ? "monthly" : "none")

    // Ativo e posição inicial juntos: se a compra falhar, o ativo não fica pela metade.
    const created = await db.transaction(async (tx) => {
        const [asset] = await tx
            .insert(assets)
            .values({
                ...rest,
                name: name ?? rest.ticker,
                ...perUnitColumn(dividendPerUnit),
                dividendFrequency,
                userId,
                currentPriceCents,
                priceUpdatedAt: currentPriceCents === null ? null : new Date(),
            })
            .returning()

        if (initialQuantity !== undefined && initialAvgPriceCents !== undefined) {
            await tx.insert(assetTrades).values({
                userId,
                assetId: asset!.id,
                type: "buy",
                quantity: String(initialQuantity),
                unitPriceCents: initialAvgPriceCents,
                feesCents: 0,
                tradedAt: todayIn(env.APP_TIMEZONE),
                notes: "Posição inicial",
            })
        }
        return asset!
    })
    return getAssetView(userId, created.id)
}

export const updateAsset = async (userId: string, assetId: string, input: UpdateAssetInput) => {
    await findOwnedAsset(userId, assetId)
    const { currentPriceCents, dividendPerUnit, ...rest } = input
    // Só mexe na cotação (e na data dela) quando o campo veio no body.
    const price =
        currentPriceCents === undefined
            ? {}
            : { currentPriceCents, priceUpdatedAt: currentPriceCents === null ? null : new Date() }
    await db
        .update(assets)
        .set({ ...rest, ...perUnitColumn(dividendPerUnit), ...price })
        .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
    return getAssetView(userId, assetId)
}

// Sem cascade, recusa se houver operações/proventos. Com cascade, apaga tudo numa transaction: as receitas que os
// proventos creditaram em conta também saem, então o saldo volta ao que era antes deles.
export const deleteAsset = async (userId: string, assetId: string, cascade = false) => {
    await findOwnedAsset(userId, assetId)
    if (cascade) {
        await db.transaction(async (tx) => {
            const credited = await tx
                .select({ transactionId: dividends.transactionId })
                .from(dividends)
                .where(and(eq(dividends.assetId, assetId), eq(dividends.userId, userId)))
            await tx.delete(dividends).where(and(eq(dividends.assetId, assetId), eq(dividends.userId, userId)))
            const transactionIds = credited.flatMap((row) => (row.transactionId ? [row.transactionId] : []))
            if (transactionIds.length > 0) {
                await tx
                    .delete(transactions)
                    .where(and(eq(transactions.userId, userId), inArray(transactions.id, transactionIds)))
            }
            await tx.delete(assetTrades).where(and(eq(assetTrades.assetId, assetId), eq(assetTrades.userId, userId)))
            await tx.delete(assets).where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
        })
        return
    }
    const [[trades], [payouts]] = await Promise.all([
        db.select({ total: count() }).from(assetTrades).where(eq(assetTrades.assetId, assetId)),
        db.select({ total: count() }).from(dividends).where(eq(dividends.assetId, assetId)),
    ])
    if ((trades?.total ?? 0) > 0 || (payouts?.total ?? 0) > 0) {
        throw new AppError("Ativo possui operações ou proventos e não pode ser excluído", 409)
    }
    await db.delete(assets).where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
}
