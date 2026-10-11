// Controller de notificações: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as NotificationsService from "./notifications.service"
import { notificationQuerySchema } from "./schemas/notification.schema"

export async function listNotifications(req: FastifyRequest, reply: FastifyReply) {
    try {
        const query = notificationQuerySchema.parse(req.query)
        const result = await NotificationsService.listNotifications(req.user.id, query)
        return reply.send({ success: true, message: "Notificações listadas", ...result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function readNotification(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const notification = await NotificationsService.markAsRead(req.user.id, id)
        return reply.send({ success: true, message: "Notificação marcada como lida", notification })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function readAllNotifications(req: FastifyRequest, reply: FastifyReply) {
    try {
        const updatedCount = await NotificationsService.markAllAsRead(req.user.id)
        return reply.send({ success: true, message: "Notificações marcadas como lidas", updatedCount })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
