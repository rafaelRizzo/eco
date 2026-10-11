// Schemas de entrada de notificações.
import { z } from "zod"

export const notificationQuerySchema = z.object({
    unread: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
})

export type NotificationQuery = z.infer<typeof notificationQuerySchema>
