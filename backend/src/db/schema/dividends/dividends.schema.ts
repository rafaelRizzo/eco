// Proventos (dividendos, JCP, rendimentos de FII): valor total recebido/a receber por ativo.
import { sql } from "drizzle-orm"
import { check, date, index, integer, numeric, pgTable, text } from "drizzle-orm/pg-core"
import { assets } from "../assets/assets.schema"
import { transactions } from "../transactions/transactions.schema"
import { createdAt, id, updatedAt } from "../columns"
import { dividendKind } from "../enums"
import { users } from "../users/users.schema"

export const dividends = pgTable(
    "dividends",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        assetId: text("asset_id")
            .notNull()
            .references(() => assets.id, { onDelete: "restrict" }),
        kind: dividendKind("kind").notNull(),
        // Cotas na data com; o valor por cota é derivado (totalCents / quantity).
        quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
        // Valor por cota em BRL (6 casas): exceção consciente à regra de centavos inteiros, pois pode ser < R$ 0,01.
        // Nulo em registros antigos; nesse caso é derivado de totalCents / quantity.
        amountPerUnit: numeric("amount_per_unit", { precision: 14, scale: 6 }),
        totalCents: integer("total_cents").notNull(),
        // Receita paga criada na conta quando o provento é confirmado como recebido; nulo = ainda não creditado.
        transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
        comDate: date("com_date", { mode: "string" }),
        payDate: date("pay_date", { mode: "string" }).notNull(),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [
        index("dividends_user_id_pay_date_idx").on(table.userId, table.payDate),
        index("dividends_asset_id_idx").on(table.assetId),
        index("dividends_transaction_id_idx").on(table.transactionId),
        check("dividends_quantity_check", sql`${table.quantity} > 0`),
        check("dividends_dates_check", sql`${table.comDate} is null or ${table.comDate} <= ${table.payDate}`),
        check("dividends_total_check", sql`${table.totalCents} > 0`),
    ],
)

export type Dividend = typeof dividends.$inferSelect
