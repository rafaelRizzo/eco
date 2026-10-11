// Lançamentos recorrentes (mensalidades, assinaturas, salário): o cron gera a transação de cada ciclo.
import { sql } from "drizzle-orm"
import { boolean, check, date, index, integer, pgTable, smallint, text, varchar } from "drizzle-orm/pg-core"
import { accounts } from "../accounts/accounts.schema"
import { categories } from "../categories/categories.schema"
import { createdAt, id, updatedAt } from "../columns"
import { creditCards } from "../credit-cards/credit-cards.schema"
import { recurrenceFrequency, transactionType } from "../enums"
import { users } from "../users/users.schema"

export const recurringTransactions = pgTable(
    "recurring_transactions",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        description: varchar("description", { length: 160 }).notNull(),
        amountCents: integer("amount_cents").notNull(),
        type: transactionType("type").notNull(),
        frequency: recurrenceFrequency("frequency").notNull().default("monthly"),
        categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
        // Destino: exatamente um dos dois (conta OU cartão).
        accountId: text("account_id").references(() => accounts.id, { onDelete: "cascade" }),
        creditCardId: text("credit_card_id").references(() => creditCards.id, { onDelete: "cascade" }),
        startDate: date("start_date", { mode: "string" }).notNull(),
        endDate: date("end_date", { mode: "string" }),
        // Dia do mês original da startDate, pra não "escorregar" depois de um fevereiro.
        anchorDay: smallint("anchor_day").notNull(),
        nextRunDate: date("next_run_date", { mode: "string" }).notNull(),
        lastRunDate: date("last_run_date", { mode: "string" }),
        // Débito automático: gera o lançamento já como pago.
        autoPay: boolean("auto_pay").notNull().default(false),
        active: boolean("active").notNull().default(true),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [
        index("recurring_transactions_user_id_idx").on(table.userId),
        index("recurring_transactions_category_id_idx").on(table.categoryId),
        index("recurring_transactions_account_id_idx").on(table.accountId),
        index("recurring_transactions_credit_card_id_idx").on(table.creditCardId),
        // Parcial: o cron só olha recorrências ativas; boolean como coluna líder não filtra nada.
        index("recurring_transactions_next_run_idx")
            .on(table.nextRunDate)
            .where(sql`${table.active} = true`),
        check(
            "recurring_transactions_target_check",
            sql`(${table.accountId} is null) <> (${table.creditCardId} is null)`,
        ),
        check("recurring_transactions_amount_check", sql`${table.amountCents} > 0`),
    ],
)

export type RecurringTransaction = typeof recurringTransactions.$inferSelect
