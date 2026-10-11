// Lançamentos (receitas/despesas) em conta ou cartão; compras no cartão apontam pra fatura.
import { sql } from "drizzle-orm"
import {
    check,
    date,
    foreignKey,
    index,
    integer,
    pgTable,
    smallint,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core"
import { accounts } from "../accounts/accounts.schema"
import { categories } from "../categories/categories.schema"
import { createdAt, id, updatedAt } from "../columns"
import { creditCards } from "../credit-cards/credit-cards.schema"
import { transactionStatus, transactionType } from "../enums"
import { invoices } from "../invoices/invoices.schema"
import { recurringTransactions } from "../recurring-transactions/recurring-transactions.schema"
import { users } from "../users/users.schema"

export const transactions = pgTable(
    "transactions",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: transactionType("type").notNull(),
        status: transactionStatus("status").notNull().default("pending"),
        description: varchar("description", { length: 160 }).notNull(),
        amountCents: integer("amount_cents").notNull(),
        // Data de competência/vencimento do lançamento.
        date: date("date", { mode: "string" }).notNull(),
        paidAt: timestamp("paid_at", { withTimezone: true, precision: 3 }),
        categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
        // restrict: apagar conta/cartão com lançamento é bloqueado (o service devolve 409 antes).
        accountId: text("account_id").references(() => accounts.id, { onDelete: "restrict" }),
        creditCardId: text("credit_card_id").references(() => creditCards.id, { onDelete: "restrict" }),
        invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: "restrict" }),
        recurringTransactionId: text("recurring_transaction_id"),
        installmentGroupId: text("installment_group_id"),
        installmentNumber: smallint("installment_number"),
        installmentTotal: smallint("installment_total"),
        notes: varchar("notes", { length: 500 }),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [
        // Nome explícito: o gerado pelo Drizzle passa de 63 chars e o Postgres trunca (gera diff fantasma).
        foreignKey({
            name: "transactions_recurring_transaction_id_fk",
            columns: [table.recurringTransactionId],
            foreignColumns: [recurringTransactions.id],
        }).onDelete("set null"),
        index("transactions_user_id_date_idx").on(table.userId, table.date),
        index("transactions_category_id_idx").on(table.categoryId),
        index("transactions_account_id_idx").on(table.accountId),
        index("transactions_credit_card_id_idx").on(table.creditCardId),
        index("transactions_invoice_id_idx").on(table.invoiceId),
        index("transactions_installment_group_id_idx").on(table.installmentGroupId),
        // Parciais: só as linhas em aberto (pending/overdue) são indexadas, o histórico pago fica de fora.
        // Crons de atraso/débito automático (sem user_id).
        index("transactions_open_date_idx")
            .on(table.date)
            .where(sql`${table.status} in ('pending', 'overdue')`),
        // "Próximos vencimentos" em conta (relatório upcoming), por usuário.
        index("transactions_user_open_account_date_idx")
            .on(table.userId, table.date)
            .where(sql`${table.status} in ('pending', 'overdue') and ${table.creditCardId} is null`),
        // Saldo da conta: soma dos pagos por conta com index-only scan (type e amount_cents na chave;
        // esta versão do Drizzle não suporta INCLUDE).
        index("transactions_account_paid_idx")
            .on(table.accountId, table.type, table.amountCents)
            .where(sql`${table.status} = 'paid'`),
        // Idempotência do cron: no máximo um lançamento por recorrência por data.
        uniqueIndex("transactions_recurring_date_unique").on(table.recurringTransactionId, table.date),
        check("transactions_target_check", sql`(${table.accountId} is null) <> (${table.creditCardId} is null)`),
        check("transactions_amount_check", sql`${table.amountCents} > 0`),
    ],
)

export type Transaction = typeof transactions.$inferSelect
