// Cartões de crédito: dia de fechamento/vencimento definem em qual fatura cada compra cai.
import { sql } from "drizzle-orm"
import { check, index, integer, pgTable, smallint, text, varchar } from "drizzle-orm/pg-core"
import { accounts } from "../accounts/accounts.schema"
import { createdAt, id, updatedAt } from "../columns"
import { users } from "../users/users.schema"

export const creditCards = pgTable(
    "credit_cards",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 80 }).notNull(),
        limitCents: integer("limit_cents").notNull().default(0),
        closingDay: smallint("closing_day").notNull(),
        dueDay: smallint("due_day").notNull(),
        // Conta padrão de onde sai o pagamento da fatura.
        paymentAccountId: text("payment_account_id").references(() => accounts.id, { onDelete: "set null" }),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [
        index("credit_cards_user_id_idx").on(table.userId),
        index("credit_cards_payment_account_id_idx").on(table.paymentAccountId),
        check("credit_cards_closing_day_check", sql`${table.closingDay} between 1 and 31`),
        check("credit_cards_due_day_check", sql`${table.dueDay} between 1 and 31`),
    ],
)

export type CreditCard = typeof creditCards.$inferSelect
