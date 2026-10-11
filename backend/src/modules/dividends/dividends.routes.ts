// Rotas HTTP de proventos, todas autenticadas e escopadas pelo usuário do token.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema, successMessageResponse } from "../../schemas/responses"
import * as DividendsController from "./dividends.controller"
import { DividendResponse, ListDividendsResponse, UpcomingDividendsResponse } from "./schemas/dividend.response"
import {
    createDividendSchema,
    listDividendsQuerySchema,
    updateDividendSchema,
    upcomingDividendsQuerySchema,
} from "./schemas/dividend.schema"

const tags = ["Dividends"]

export async function dividendsRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/dividends",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista os proventos de um mês (padrão: mês atual) com estimativas de FIIs",
                security: bearerSecurity,
                querystring: listDividendsQuerySchema,
                response: { 200: ListDividendsResponse, 400: errors[400], 401: errors[401] },
            },
        },
        DividendsController.listDividends as any,
    )

    router.get(
        "/dividends/upcoming",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Totais de proventos por mês, do mês atual em diante",
                security: bearerSecurity,
                querystring: upcomingDividendsQuerySchema,
                response: { 200: UpcomingDividendsResponse, 400: errors[400], 401: errors[401] },
            },
        },
        DividendsController.listUpcoming as any,
    )

    router.post(
        "/dividends",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Registra um provento",
                security: bearerSecurity,
                body: createDividendSchema,
                response: { 201: DividendResponse, 400: errors[400], 401: errors[401], 404: errors[404] },
            },
        },
        DividendsController.createDividend as any,
    )

    router.patch(
        "/dividends/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Atualiza um provento",
                security: bearerSecurity,
                params: idParamSchema,
                body: updateDividendSchema,
                response: { 200: DividendResponse, 400: errors[400], 401: errors[401], 404: errors[404] },
            },
        },
        DividendsController.updateDividend as any,
    )

    router.delete(
        "/dividends/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Exclui um provento",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: successMessageResponse, 401: errors[401], 404: errors[404] },
            },
        },
        DividendsController.deleteDividend as any,
    )
}
