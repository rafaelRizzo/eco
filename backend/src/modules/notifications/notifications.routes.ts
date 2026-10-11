// Rotas HTTP de notificações geradas pelos crons, todas autenticadas.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema } from "../../schemas/responses"
import * as NotificationsController from "./notifications.controller"
import {
    ListNotificationsResponse,
    ReadAllNotificationsResponse,
    ReadNotificationResponse,
} from "./schemas/notification.response"
import { notificationQuerySchema } from "./schemas/notification.schema"

const tags = ["Notifications"]

export async function notificationsRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/notifications",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista notificações (contas a vencer, faturas...)",
                security: bearerSecurity,
                querystring: notificationQuerySchema,
                response: { 200: ListNotificationsResponse, 400: errors[400], 401: errors[401] },
            },
        },
        NotificationsController.listNotifications as any,
    )

    router.post(
        "/notifications/read-all",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Marca todas como lidas",
                security: bearerSecurity,
                response: { 200: ReadAllNotificationsResponse, 401: errors[401] },
            },
        },
        NotificationsController.readAllNotifications as any,
    )

    router.post(
        "/notifications/:id/read",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Marca uma notificação como lida",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: ReadNotificationResponse, 401: errors[401], 404: errors[404] },
            },
        },
        NotificationsController.readNotification as any,
    )
}
