// Monta a instância Fastify (plugins, docs, rotas) sem dar listen: usado pelo main.ts e pelos testes (app.inject).
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import swagger from "@fastify/swagger"
import scalar from "@scalar/fastify-api-reference"
import Fastify from "fastify"
import {
    jsonSchemaTransform,
    serializerCompiler,
    validatorCompiler,
    type ZodTypeProvider,
} from "fastify-type-provider-zod"
import { z } from "zod"
import { env } from "./env"
import { handleError } from "./lib/errors"
import { loggerOptions } from "./lib/logger"
import { accountsRoutes } from "./modules/accounts/accounts.routes"
import { assetTradesRoutes } from "./modules/asset-trades/asset-trades.routes"
import { assetsRoutes } from "./modules/assets/assets.routes"
import { dividendsRoutes } from "./modules/dividends/dividends.routes"
import { authRoutes } from "./modules/auth/auth.routes"
import { categoriesRoutes } from "./modules/categories/categories.routes"
import { creditCardsRoutes } from "./modules/credit-cards/credit-cards.routes"
import { invoicesRoutes } from "./modules/invoices/invoices.routes"
import { notificationsRoutes } from "./modules/notifications/notifications.routes"
import { profileRoutes } from "./modules/profile/profile.routes"
import { recurringTransactionsRoutes } from "./modules/recurring-transactions/recurring-transactions.routes"
import { reportsRoutes } from "./modules/reports/reports.routes"
import { setupRoutes } from "./modules/setup/setup.routes"
import { transactionsRoutes } from "./modules/transactions/transactions.routes"
import { usersRoutes } from "./modules/users/users.routes"

export const buildApp = async () => {
    const app = Fastify({ logger: loggerOptions, trustProxy: (_address, hop) => hop < env.TRUST_PROXY_HOPS })

    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    // Rede de segurança pra erro que não passou pelo try/catch de um controller (ex: validação do schema da rota).
    app.setErrorHandler((error, req, reply) => handleError(reply, error, req))
    app.setNotFoundHandler((_req, reply) => reply.status(404).send({ success: false, message: "Rota não encontrada" }))

    await app.register(cors, {
        origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    })
    // global: false -> só rotas com config.rateLimit (login/cadastro). Store em memória: por réplica.
    await app.register(rateLimit, { global: false })

    await app.register(swagger, {
        openapi: {
            info: { title: "Eco API", description: "API de controle de gastos", version: "0.1.0" },
            components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
        },
        transform: jsonSchemaTransform,
    })

    // Scalar fora de produção e fora do escopo do helmet (o CSP do helmet bloqueia o script inline dele).
    if (env.NODE_ENV !== "production") {
        await app.register(scalar, { routePrefix: "/docs" })
    }

    await app.register(async (api) => {
        await api.register(helmet)

        api.withTypeProvider<ZodTypeProvider>().get(
            "/health",
            {
                schema: {
                    tags: ["Health"],
                    summary: "Health check",
                    response: { 200: z.object({ success: z.literal(true), status: z.literal("ok") }) },
                },
            },
            async () => ({ success: true as const, status: "ok" as const }),
        )

        await api.register(setupRoutes)
        await api.register(authRoutes)
        await api.register(accountsRoutes)
        await api.register(assetsRoutes)
        await api.register(assetTradesRoutes)
        await api.register(dividendsRoutes)
        await api.register(categoriesRoutes)
        await api.register(creditCardsRoutes)
        await api.register(invoicesRoutes)
        await api.register(transactionsRoutes)
        await api.register(recurringTransactionsRoutes)
        await api.register(notificationsRoutes)
        await api.register(reportsRoutes)
        await api.register(profileRoutes)
        await api.register(usersRoutes)
    })

    return app
}
