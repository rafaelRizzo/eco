// Faturas de cartão: uma por cartão por mês de vencimento (reference_month = "YYYY-MM" do due_date).
import { date, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { accounts } from "../accounts/accounts.schema"
import { createdAt, id, updatedAt } from "../columns"
import { creditCards } from "../credit-cards/credit-cards.schema"
import { invoiceStatus } from "../enums"
import { users } from "../users/users.schema"

export const invoices = pgTable(
    "invoices",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        creditCardId: text("credit_card_id")
            .notNull()
            .references(() => creditCards.id, { onDelete: "cascade" }),
        referenceMonth: varchar("reference_month", { length: 7 }).notNull(),
        closingDate: date("closing_date", { mode: "string" }).notNull(),
        dueDate: date("due_date", { mode: "string" }).notNull(),
        status: invoiceStatus("status").notNull().default("open"),
        paidAt: timestamp("paid_at", { withTimezone: true, precision: 3 }),
        paidAmountCents: integer("paid_amount_cents"),
        paidFromAccountId: text("paid_from_account_id").references(() => accounts.id, { onDelete: "set null" }),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [
        // O prefixo user_id cobre buscas por usuário; due_date serve o order by e o range do upcoming.
        index("invoices_user_id_due_date_idx").on(table.userId, table.dueDate),
        index("invoices_credit_card_id_idx").on(table.creditCardId),
        index("invoices_paid_from_account_id_idx").on(table.paidFromAccountId),
        index("invoices_status_due_date_idx").on(table.status, table.dueDate),
        uniqueIndex("invoices_card_reference_month_unique").on(table.creditCardId, table.referenceMonth),
    ],
)

export type Invoice = typeof invoices.$inferSelect
