// Rotas HTTP de cartões de crédito, todas autenticadas.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema, successMessageResponse } from "../../schemas/responses"
import * as CreditCardsController from "./credit-cards.controller"
import {
    CreateCreditCardResponse,
    GetCreditCardResponse,
    ListCreditCardsResponse,
    UpdateCreditCardResponse,
} from "./schemas/credit-card.response"
import { createCreditCardSchema, updateCreditCardSchema } from "./schemas/credit-card.schema"

const tags = ["Credit Cards"]

export async function creditCardsRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/credit-cards",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista cartões com limite usado/disponível",
                security: bearerSecurity,
                response: { 200: ListCreditCardsResponse, 401: errors[401] },
            },
        },
        CreditCardsController.listCreditCards as any,
    )

    router.get(
        "/credit-cards/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Detalha um cartão",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: GetCreditCardResponse, 401: errors[401], 404: errors[404] },
            },
        },
        CreditCardsController.getCreditCard as any,
    )

    router.post(
        "/credit-cards",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Cria um cartão",
                security: bearerSecurity,
                body: createCreditCardSchema,
                response: { 201: CreateCreditCardResponse, 400: errors[400], 401: errors[401], 404: errors[404] },
            },
        },
        CreditCardsController.createCreditCard as any,
    )

    router.patch(
        "/credit-cards/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Atualiza um cartão",
                security: bearerSecurity,
                params: idParamSchema,
                body: updateCreditCardSchema,
                response: { 200: UpdateCreditCardResponse, 400: errors[400], 401: errors[401], 404: errors[404] },
            },
        },
        CreditCardsController.updateCreditCard as any,
    )

    router.delete(
        "/credit-cards/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Exclui um cartão sem lançamentos",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: successMessageResponse, 401: errors[401], 404: errors[404], 409: errors[409] },
            },
        },
        CreditCardsController.deleteCreditCard as any,
    )
}
