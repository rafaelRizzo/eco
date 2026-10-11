// Estado interno do bootstrap (sem user_id de propósito): linha única que marca o /setup como concluído.
// O check em `id` garante uma linha só; a PK impede que um segundo /setup concorrente também "conclua".
// Sem índice em super_admin_id de propósito: a tabela tem uma linha.
import { sql } from "drizzle-orm"
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "../users/users.schema"

export const SYSTEM_SETUP_ID = "default"

export const systemSetup = pgTable(
    "system_setup",
    {
        id: text("id").primaryKey().default(SYSTEM_SETUP_ID),
        completedAt: timestamp("completed_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
        superAdminId: text("super_admin_id").references(() => users.id, { onDelete: "set null" }),
    },
    (table) => [check("system_setup_singleton_check", sql`${table.id} = 'default'`)],
)

export type SystemSetup = typeof systemSetup.$inferSelect
