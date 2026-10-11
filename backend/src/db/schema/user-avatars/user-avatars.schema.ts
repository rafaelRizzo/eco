// Foto de perfil (1 por usuário): imagem já reencodada pelo servidor (webp 256x256), guardada no próprio Postgres.
import { sql } from "drizzle-orm"
import { check, customType, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { users } from "../users/users.schema"

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" })

export const userAvatars = pgTable(
    "user_avatars",
    {
        // PK = user_id: no máximo uma foto por usuário e upload novo substitui a anterior (upsert).
        userId: text("user_id")
            .primaryKey()
            .references(() => users.id, { onDelete: "cascade" }),
        contentType: varchar("content_type", { length: 40 }).notNull(),
        data: bytea("data").notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
    },
    (table) => [
        // Trava no banco o que o processAvatarImage garante no app: só webp e no máximo 512 KB (o real fica em ~30 KB).
        check("user_avatars_content_type_check", sql`${table.contentType} = 'image/webp'`),
        check("user_avatars_data_size_check", sql`octet_length(${table.data}) between 1 and 524288`),
    ],
)

export type UserAvatar = typeof userAvatars.$inferSelect
