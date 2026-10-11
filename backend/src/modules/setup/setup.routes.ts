// Rotas públicas do bootstrap: GET /setup (status) e POST /setup (cria o primeiro super admin, com rate limit).
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { errors } from "../../schemas/responses"
import { CompleteSetupResponse, SetupStatusResponse } from "./schemas/setup.response"
import { completeSetupSchema } from "./schemas/setup.schema"
import * as SetupController from "./setup.controller"

const tags = ["Setup"]

export async function setupRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/setup",
        {
            schema: {
                tags,
                summary: "Diz se a configuração inicial já foi feita",
                response: { 200: SetupStatusResponse },
            },
        },
        SetupController.getSetupStatus as any,
    )

    router.post(
        "/setup",
        {
            // Força bruta no token: poucas tentativas por minuto.
            config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
            schema: {
                tags,
                summary: "Cria o primeiro super admin (uso único, exige SETUP_TOKEN)",
                body: completeSetupSchema,
                response: {
                    201: CompleteSetupResponse,
                    400: errors[400],
                    403: errors[403],
                    409: errors[409],
                    429: errors[429],
                },
            },
        },
        SetupController.completeSetup as any,
    )
}
