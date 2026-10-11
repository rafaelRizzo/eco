// Regras de notificações: leitura pelo usuário + criação idempotente pelos crons (dedupe_key).
import { and, count, desc, eq, isNull } from "drizzle-orm"
import { notifications } from "../../db/schema"
import { cached } from "../../lib/cache"
import { type DbOrTx, db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import type { NotificationQuery } from "./schemas/notification.schema"

type NewNotification = typeof notifications.$inferInsert

// Retorna true só se criou (false = já existia aviso com a mesma dedupe_key).
export const notify = async (executor: DbOrTx, values: NewNotification) => {
    const created = await executor
        .insert(notifications)
        .values(values)
        .onConflictDoNothing({ target: notifications.dedupeKey })
        .returning({ id: notifications.id })
    return created.length > 0
}

export const listNotifications = (userId: string, query: NotificationQuery) =>
    cached(userId, "notifications", JSON.stringify(query), async () => {
        const [items, [unread]] = await Promise.all([
            db.query.notifications.findMany({
                where: and(
                    eq(notifications.userId, userId),
                    query.unread === true ? isNull(notifications.readAt) : undefined,
                ),
                orderBy: [desc(notifications.createdAt)],
                limit: query.limit,
            }),
            db
                .select({ value: count() })
                .from(notifications)
                .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
        ])
        return { notifications: items, unreadCount: unread?.value ?? 0 }
    })

export const markAsRead = async (userId: string, notificationId: string) => {
    const [updated] = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
        .returning()
    if (!updated) throw new AppError("Notificação não encontrada", 404)
    return updated
}

export const markAllAsRead = async (userId: string) => {
    const updated = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
        .returning({ id: notifications.id })
    return updated.length
}
