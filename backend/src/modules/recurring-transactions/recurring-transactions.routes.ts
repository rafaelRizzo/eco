// Rotas HTTP de recorrências (mensalidades/assinaturas), todas autenticadas.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema, successMessageResponse } from "../../schemas/responses"
import * as RecurringTransactionsController from "./recurring-transactions.controller"
import {
    CreateRecurringTransactionResponse,
    GetRecurringTransactionResponse,
    ListRecurringTransactionsResponse,
    UpdateRecurringTransactionResponse,
} from "./schemas/recurring-transaction.response"
import {
    createRecurringTransactionSchema,
    recurringTransactionQuerySchema,
    updateRecurringTransactionSchema,
} from "./schemas/recurring-transaction.schema"

const tags = ["Recurring Transactions"]

export async function recurringTransactionsRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/recurring-transactions",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista recorrências",
                security: bearerSecurity,
                querystring: recurringTransactionQuerySchema,
                response: { 200: ListRecurringTransactionsResponse, 400: errors[400], 401: errors[401] },
            },
        },
        RecurringTransactionsController.listRecurringTransactions as any,
    )

    router.get(
        "/recurring-transactions/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Detalha uma recorrência",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: GetRecurringTransactionResponse, 401: errors[401], 404: errors[404] },
            },
        },
        RecurringTransactionsController.getRecurringTransaction as any,
    )

    router.post(
        "/recurring-transactions",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Cria recorrência (o cron gera um lançamento a cada vencimento)",
                security: bearerSecurity,
                body: createRecurringTransactionSchema,
                response: {
                    201: CreateRecurringTransactionResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                },
            },
        },
        RecurringTransactionsController.createRecurringTransaction as any,
    )

    router.patch(
        "/recurring-transactions/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Atualiza/pausa/reativa uma recorrência",
                security: bearerSecurity,
                params: idParamSchema,
                body: updateRecurringTransactionSchema,
                response: {
                    200: UpdateRecurringTransactionResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                },
            },
        },
        RecurringTransactionsController.updateRecurringTransaction as any,
    )

    router.delete(
        "/recurring-transactions/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Exclui recorrência (lançamentos já gerados são mantidos)",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: successMessageResponse, 401: errors[401], 404: errors[404] },
            },
        },
        RecurringTransactionsController.deleteRecurringTransaction as any,
    )
}
