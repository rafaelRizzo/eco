// Operações de compra/venda de ativos; a posição e o preço médio são calculados a partir delas.
import { sql } from "drizzle-orm"
import { check, date, index, integer, numeric, pgTable, text, varchar } from "drizzle-orm/pg-core"
import { assets } from "../assets/assets.schema"
import { createdAt, id, updatedAt } from "../columns"
import { tradeType } from "../enums"
import { users } from "../users/users.schema"

export const assetTrades = pgTable(
    "asset_trades",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        assetId: text("asset_id")
            .notNull()
            .references(() => assets.id, { onDelete: "restrict" }),
        type: tradeType("type").notNull(),
        // Quantidade fracionada (cripto/dólar); numeric volta como string do driver.
        quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
        unitPriceCents: integer("unit_price_cents").notNull(),
        feesCents: integer("fees_cents").notNull().default(0),
        tradedAt: date("traded_at", { mode: "string" }).notNull(),
        notes: varchar("notes", { length: 500 }),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [
        index("asset_trades_user_id_traded_at_idx").on(table.userId, table.tradedAt),
        index("asset_trades_asset_id_idx").on(table.assetId),
        check("asset_trades_quantity_check", sql`${table.quantity} > 0`),
        check("asset_trades_unit_price_check", sql`${table.unitPriceCents} >= 0`),
        check("asset_trades_fees_check", sql`${table.feesCents} >= 0`),
    ],
)

export type AssetTrade = typeof assetTrades.$inferSelect
