// Avisos gerados pelos crons (conta a vencer, fatura fechada...); dedupe_key evita aviso duplicado.
import { isNull } from "drizzle-orm"
import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { createdAt, id } from "../columns"
import { notificationType } from "../enums"
import { invoices } from "../invoices/invoices.schema"
import { transactions } from "../transactions/transactions.schema"
import { users } from "../users/users.schema"

export const notifications = pgTable(
    "notifications",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: notificationType("type").notNull(),
        title: varchar("title", { length: 160 }).notNull(),
        message: varchar("message", { length: 500 }).notNull(),
        transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "cascade" }),
        invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: "cascade" }),
        dedupeKey: varchar("dedupe_key", { length: 200 }).notNull(),
        readAt: timestamp("read_at", { withTimezone: true, precision: 3 }),
        createdAt: createdAt(),
    },
    (table) => [
        index("notifications_user_id_created_at_idx").on(table.userId, table.createdAt),
        // Não lidas: serve o contador do sino e o filtro ?unread=true sem varrer o histórico lido.
        index("notifications_user_id_unread_idx")
            .on(table.userId, table.createdAt)
            .where(isNull(table.readAt)),
        index("notifications_transaction_id_idx").on(table.transactionId),
        index("notifications_invoice_id_idx").on(table.invoiceId),
        uniqueIndex("notifications_dedupe_key_unique").on(table.dedupeKey),
    ],
)

export type Notification = typeof notifications.$inferSelect
