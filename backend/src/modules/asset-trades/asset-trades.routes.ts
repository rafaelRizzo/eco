// Rotas HTTP das operações de compra/venda de ativos, autenticadas e escopadas pelo usuário do token.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema, successMessageResponse } from "../../schemas/responses"
import * as AssetTradesController from "./asset-trades.controller"
import { CreateAssetTradeResponse, ListAssetTradesResponse } from "./schemas/asset-trade.response"
import { createAssetTradeSchema, listAssetTradesQuerySchema } from "./schemas/asset-trade.schema"

const tags = ["Asset trades"]

export async function assetTradesRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/asset-trades",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista operações de compra/venda (opcionalmente de um ativo)",
                security: bearerSecurity,
                querystring: listAssetTradesQuerySchema,
                response: { 200: ListAssetTradesResponse, 400: errors[400], 401: errors[401], 404: errors[404] },
            },
        },
        AssetTradesController.listTrades as any,
    )

    router.post(
        "/asset-trades",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Registra uma compra ou venda",
                security: bearerSecurity,
                body: createAssetTradeSchema,
                response: {
                    201: CreateAssetTradeResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        AssetTradesController.createTrade as any,
    )

    router.delete(
        "/asset-trades/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Exclui uma operação (recusa se deixar a posição negativa)",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: successMessageResponse, 401: errors[401], 404: errors[404], 409: errors[409] },
            },
        },
        AssetTradesController.deleteTrade as any,
    )
}
