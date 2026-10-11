// Rotas HTTP de ativos de investimento, todas autenticadas e escopadas pelo usuário do token.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema, successMessageResponse } from "../../schemas/responses"
import * as AssetsController from "./assets.controller"
import { CreateAssetResponse, ListAssetsResponse, UpdateAssetResponse } from "./schemas/asset.response"
import { createAssetSchema, deleteAssetQuerySchema, updateAssetSchema } from "./schemas/asset.schema"

const tags = ["Assets"]

export async function assetsRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/assets",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista a carteira com posição, avaliação e alocação por classe",
                security: bearerSecurity,
                response: { 200: ListAssetsResponse, 401: errors[401] },
            },
        },
        AssetsController.listAssets as any,
    )

    router.post(
        "/assets",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Cadastra um ativo",
                security: bearerSecurity,
                body: createAssetSchema,
                response: { 201: CreateAssetResponse, 400: errors[400], 401: errors[401], 409: errors[409] },
            },
        },
        AssetsController.createAsset as any,
    )

    router.patch(
        "/assets/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Atualiza um ativo ou sua cotação manual",
                security: bearerSecurity,
                params: idParamSchema,
                body: updateAssetSchema,
                response: {
                    200: UpdateAssetResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        AssetsController.updateAsset as any,
    )

    router.delete(
        "/assets/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Exclui um ativo (cascade=true apaga também operações, proventos e receitas creditadas)",
                security: bearerSecurity,
                params: idParamSchema,
                querystring: deleteAssetQuerySchema,
                response: {
                    200: successMessageResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        AssetsController.deleteAsset as any,
    )
}
