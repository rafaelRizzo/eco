// Ativos de investimento (ações, FIIs, cripto, dólar). Preço sempre em centavos de BRL por unidade.
import { sql } from "drizzle-orm"
import { check, date, integer, numeric, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { createdAt, id, updatedAt } from "../columns"
import { assetClass, dividendFrequency } from "../enums"
import { users } from "../users/users.schema"

export const assets = pgTable(
    "assets",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        ticker: varchar("ticker", { length: 20 }).notNull(),
        name: varchar("name", { length: 80 }).notNull(),
        class: assetClass("class").notNull(),
        // Provento esperado por cota (BRL, 6 casas) e data do próximo pagamento: base da projeção quando ainda
        // não há provento lançado. Mesma exceção de precisão de dividends.amount_per_unit.
        dividendPerUnit: numeric("dividend_per_unit", { precision: 14, scale: 6 }),
        nextDividendDate: date("next_dividend_date", { mode: "string" }),
        // Recorrência dos proventos: base da projeção dos próximos pagamentos.
        dividendFrequency: dividendFrequency("dividend_frequency").notNull().default("none"),
        // Cotação manual (centavos de BRL por unidade); nula até o usuário informar.
        currentPriceCents: integer("current_price_cents"),
        priceUpdatedAt: timestamp("price_updated_at", { withTimezone: true, precision: 3 }),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [
        // O unique composto já cobre buscas por user_id (prefixo do índice).
        uniqueIndex("assets_user_id_ticker_unique").on(table.userId, table.ticker),
        check("assets_current_price_check", sql`${table.currentPriceCents} >= 0`),
    ],
)

export type Asset = typeof assets.$inferSelect
