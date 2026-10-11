// Regras das operações: compra/venda nunca pode deixar a posição do ativo negativa (revalida o histórico inteiro).
import { and, desc, eq } from "drizzle-orm"
import { assetTrades, assets } from "../../db/schema"
import { type DbOrTx, db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import { computePosition, PositionError, type TradeLike } from "../../lib/investments"
import { findOwnedAsset, toTradeLike } from "../assets/assets.service"
import type { CreateAssetTradeInput } from "./schemas/asset-trade.schema"

type TradeRow = typeof assetTrades.$inferSelect

const toView = (row: TradeRow, asset: { ticker: string; name: string }) => {
    const gross = Math.round(Number(row.quantity) * row.unitPriceCents)
    return {
        id: row.id,
        assetId: row.assetId,
        ticker: asset.ticker,
        assetName: asset.name,
        type: row.type,
        quantity: Number(row.quantity),
        unitPriceCents: row.unitPriceCents,
        feesCents: row.feesCents,
        totalCents: row.type === "buy" ? gross + row.feesCents : gross - row.feesCents,
        tradedAt: row.tradedAt,
        notes: row.notes,
        createdAt: row.createdAt,
    }
}

const findOwnedTrade = async (userId: string, tradeId: string, executor: DbOrTx = db) => {
    const trade = await executor.query.assetTrades.findFirst({
        where: and(eq(assetTrades.id, tradeId), eq(assetTrades.userId, userId)),
    })
    if (!trade) throw new AppError("Operação não encontrada", 404)
    return trade
}

// Trava a linha do ativo na transaction pra duas operações simultâneas não furarem a checagem de posição.
const lockAsset = async (userId: string, assetId: string, tx: DbOrTx) => {
    const [asset] = await tx
        .select()
        .from(assets)
        .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
        .for("update")
    if (!asset) throw new AppError("Ativo não encontrado", 404)
    return asset
}

const assertPosition = (trades: TradeLike[], message: string) => {
    try {
        computePosition(trades)
    } catch (error) {
        if (error instanceof PositionError) throw new AppError(message, 409)
        throw error
    }
}

export const listTrades = async (userId: string, assetId?: string) => {
    if (assetId) await findOwnedAsset(userId, assetId)
    const rows = await db
        .select({ trade: assetTrades, ticker: assets.ticker, name: assets.name })
        .from(assetTrades)
        .innerJoin(assets, eq(assets.id, assetTrades.assetId))
        .where(and(eq(assetTrades.userId, userId), assetId ? eq(assetTrades.assetId, assetId) : undefined))
        .orderBy(desc(assetTrades.tradedAt), desc(assetTrades.createdAt))
    return rows.map((row) => toView(row.trade, row))
}

export const createTrade = async (userId: string, input: CreateAssetTradeInput) =>
    db.transaction(async (tx) => {
        const asset = await lockAsset(userId, input.assetId, tx)
        const existing = await tx.select().from(assetTrades).where(eq(assetTrades.assetId, asset.id))

        const [created] = await tx
            .insert(assetTrades)
            .values({ ...input, quantity: String(input.quantity), userId })
            .returning()

        assertPosition(
            [...existing, created!].map(toTradeLike),
            "Venda maior que a quantidade em carteira nessa data",
        )
        return toView(created!, asset)
    })

export const deleteTrade = async (userId: string, tradeId: string) =>
    db.transaction(async (tx) => {
        const trade = await findOwnedTrade(userId, tradeId, tx)
        await lockAsset(userId, trade.assetId, tx)
        const remaining = await tx
            .select()
            .from(assetTrades)
            .where(eq(assetTrades.assetId, trade.assetId))
        assertPosition(
            remaining.filter((row) => row.id !== trade.id).map(toTradeLike),
            "Excluir esta compra deixaria uma venda posterior sem quantidade em carteira",
        )
        await tx.delete(assetTrades).where(and(eq(assetTrades.id, trade.id), eq(assetTrades.userId, userId)))
    })
