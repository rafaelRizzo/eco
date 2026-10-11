// Contas/carteiras onde o dinheiro entra e sai (conta corrente, poupança, dinheiro...).
import { index, integer, pgTable, text, varchar } from "drizzle-orm/pg-core"
import { createdAt, id, updatedAt } from "../columns"
import { accountType } from "../enums"
import { users } from "../users/users.schema"

export const accounts = pgTable(
    "accounts",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 80 }).notNull(),
        type: accountType("type").notNull().default("checking"),
        // Valores monetários sempre em centavos inteiros, nunca float.
        initialBalanceCents: integer("initial_balance_cents").notNull().default(0),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [index("accounts_user_id_idx").on(table.userId)],
)

export type Account = typeof accounts.$inferSelect
