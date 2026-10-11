// Colunas repetidas em toda tabela: id CUID2 e timestamps UTC com precisão de ms.
import { createId } from "@paralleldrive/cuid2"
import { text, timestamp } from "drizzle-orm/pg-core"

export const id = () =>
    text("id")
        .primaryKey()
        .$defaultFn(() => createId())

export const createdAt = () => timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow()

export const updatedAt = () =>
    timestamp("updated_at", { withTimezone: true, precision: 3 })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
