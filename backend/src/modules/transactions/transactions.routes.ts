// Rotas HTTP de lançamentos, todas autenticadas.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema } from "../../schemas/responses"
import {
    CreateTransactionResponse,
    DeleteTransactionResponse,
    GetTransactionResponse,
    ListTransactionsResponse,
    PayTransactionResponse,
    UpdateTransactionResponse,
} from "./schemas/transaction.response"
import {
    createTransactionSchema,
    deleteTransactionQuerySchema,
    payTransactionSchema,
    transactionQuerySchema,
    updateTransactionSchema,
} from "./schemas/transaction.schema"
import * as TransactionsController from "./transactions.controller"

const tags = ["Transactions"]

export async function transactionsRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/transactions",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista lançamentos com filtros (mês, período, tipo, status, conta, cartão...)",
                security: bearerSecurity,
                querystring: transactionQuerySchema,
                response: { 200: ListTransactionsResponse, 400: errors[400], 401: errors[401] },
            },
        },
        TransactionsController.listTransactions as any,
    )

    router.get(
        "/transactions/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Detalha um lançamento",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: GetTransactionResponse, 401: errors[401], 404: errors[404] },
            },
        },
        TransactionsController.getTransaction as any,
    )

    router.post(
        "/transactions",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Cria lançamento em conta ou compra no cartão (à vista ou parcelada)",
                security: bearerSecurity,
                body: createTransactionSchema,
                response: {
                    201: CreateTransactionResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        TransactionsController.createTransaction as any,
    )

    router.patch(
        "/transactions/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Atualiza um lançamento",
                security: bearerSecurity,
                params: idParamSchema,
                body: updateTransactionSchema,
                response: {
                    200: UpdateTransactionResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        TransactionsController.updateTransaction as any,
    )

    router.post(
        "/transactions/:id/pay",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Marca lançamento de conta como pago",
                security: bearerSecurity,
                params: idParamSchema,
                body: payTransactionSchema.optional(),
                response: {
                    200: PayTransactionResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        TransactionsController.payTransaction as any,
    )

    router.delete(
        "/transactions/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Exclui um lançamento (scope=installments exclui todas as parcelas)",
                security: bearerSecurity,
                params: idParamSchema,
                querystring: deleteTransactionQuerySchema,
                response: {
                    200: DeleteTransactionResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        TransactionsController.deleteTransaction as any,
    )
}
