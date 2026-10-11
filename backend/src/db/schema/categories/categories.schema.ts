// Categorias de receita/despesa por usuário (criadas com um conjunto padrão no cadastro).
import { pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { createdAt, id, updatedAt } from "../columns"
import { transactionType } from "../enums"
import { users } from "../users/users.schema"

export const categories = pgTable(
    "categories",
    {
        id: id(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 60 }).notNull(),
        type: transactionType("type").notNull(),
        color: varchar("color", { length: 7 }),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
    },
    (table) => [
        // O unique composto já cobre buscas por user_id (prefixo do índice).
        uniqueIndex("categories_user_name_type_unique").on(table.userId, table.name, table.type),
    ],
)

export type Category = typeof categories.$inferSelect
