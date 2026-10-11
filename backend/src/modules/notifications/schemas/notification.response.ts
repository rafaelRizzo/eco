// Schemas de resposta de notificações.
import { z } from "zod"
import { notificationTypeValues } from "../../../db/schema"

export const NotificationSchema = z.object({
    id: z.string(),
    type: z.enum(notificationTypeValues),
    title: z.string(),
    message: z.string(),
    transactionId: z.string().nullable(),
    invoiceId: z.string().nullable(),
    readAt: z.date().nullable(),
    createdAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const ListNotificationsResponse = z.object({
    ...envelope,
    unreadCount: z.number().int(),
    notifications: z.array(NotificationSchema),
})
export const ReadNotificationResponse = z.object({ ...envelope, notification: NotificationSchema })
export const ReadAllNotificationsResponse = z.object({ ...envelope, updatedCount: z.number().int() })
