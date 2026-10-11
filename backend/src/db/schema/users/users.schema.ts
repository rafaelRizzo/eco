// Usuário dono dos dados: todo recurso financeiro é escopado por user_id. role/status controlam acesso.
import { pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { createdAt, id, updatedAt } from "../columns"
import { userRole, userStatus } from "../enums"

export const users = pgTable(
    "users",
    {
        id: id(),
        name: varchar("name", { length: 120 }).notNull(),
        email: varchar("email", { length: 254 }).notNull(),
        passwordHash: text("password_hash").notNull(),
        role: userRole("role").notNull().default("user"),
        status: userStatus("status").notNull().default("active"),
        // Quando a foto foi trocada (nula = sem foto); o front usa de cache-bust. Os bytes ficam em user_avatars.
        avatarUpdatedAt: timestamp("avatar_updated_at", { withTimezone: true, precision: 3 }),
        // Tokens emitidos antes disso deixam de valer (troca/reset de senha derruba as outras sessões).
        passwordChangedAt: timestamp("password_changed_at", { withTimezone: true, precision: 3 }),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [uniqueIndex("users_email_unique").on(table.email)],
)

export type User = typeof users.$inferSelect
