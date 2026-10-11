// Rotas de auth: cadastro e login públicos (com rate limit) e /auth/me protegida.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, successMessageResponse } from "../../schemas/responses"
import * as AuthController from "./auth.controller"
import { AuthResponse, MeResponse } from "./schemas/auth.response"
import { loginSchema, registerSchema } from "./schemas/auth.schema"

const authRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } }

export async function authRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.post(
        "/auth/register",
        {
            config: authRateLimit,
            schema: {
                tags: ["Auth"],
                summary: "Cria uma conta",
                body: registerSchema,
                response: { 201: AuthResponse, 400: errors[400], 403: errors[403], 409: errors[409], 429: errors[429] },
            },
        },
        AuthController.register as any,
    )

    router.post(
        "/auth/login",
        {
            config: authRateLimit,
            schema: {
                tags: ["Auth"],
                summary: "Login com e-mail e senha",
                body: loginSchema,
                response: { 200: AuthResponse, 400: errors[400], 401: errors[401], 403: errors[403], 429: errors[429] },
            },
        },
        AuthController.login as any,
    )

    router.get(
        "/auth/me",
        {
            onRequest: protectedRoute,
            schema: {
                tags: ["Auth"],
                summary: "Usuário autenticado",
                security: bearerSecurity,
                response: { 200: MeResponse, 401: errors[401], 404: errors[404] },
            },
        },
        AuthController.me as any,
    )

    router.post(
        "/auth/logout",
        {
            onRequest: protectedRoute,
            schema: {
                tags: ["Auth"],
                summary: "Encerra a sessão (revoga o token usado na chamada)",
                security: bearerSecurity,
                response: { 200: successMessageResponse, 401: errors[401] },
            },
        },
        AuthController.logout as any,
    )
}
