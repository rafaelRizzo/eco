// Tokens encerrados no logout (jti): o JWT é stateless, então "sair" só vale no servidor se o token entrar nesta lista.
// Sem user_id de propósito (estado de sessão, não dado do usuário); a linha some sozinha depois que o token expiraria.
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const revokedTokens = pgTable(
    "revoked_tokens",
    {
        jti: text("jti").primaryKey(),
        // exp do JWT: depois disso o token já não vale de qualquer jeito, então a linha pode ser apagada.
        expiresAt: timestamp("expires_at", { withTimezone: true, precision: 3 }).notNull(),
    },
    (table) => [index("revoked_tokens_expires_at_idx").on(table.expiresAt)],
)

export type RevokedToken = typeof revokedTokens.$inferSelect
