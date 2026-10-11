// Rotas do perfil do próprio usuário (nome, e-mail, senha e foto): qualquer usuário ativo, sempre sobre a própria conta.
import type { FastifyInstance, FastifyRequest } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, successMessageResponse } from "../../schemas/responses"
import * as ProfileController from "./profile.controller"
import { AvatarResponse, ProfileResponse, UpdateProfileResponse } from "./schemas/profile.response"
import { updateProfileSchema, uploadAvatarSchema } from "./schemas/profile.schema"

const tags = ["Profile"]

// Limite por CONTA (não por IP): troca de senha/e-mail confere a senha atual (argon2), então com token roubado o
// atacante não ganha tentativas trocando de IP (nem divide o balde de outros usuários atrás do mesmo proxy).
// O handler do rate-limit entra no fim do onRequest da rota, depois do authMiddleware, então req.user já existe.
const perUserRateLimit = {
    rateLimit: { max: 10, timeWindow: "1 minute", keyGenerator: (req: FastifyRequest) => req.user?.id ?? req.ip },
}
const sensitiveRateLimit = perUserRateLimit
const uploadRateLimit = perUserRateLimit
// O rate-limit faz push no array onRequest da rota: cópia pra não alterar o `protectedRoute` compartilhado.
const guardedRoute = () => [...protectedRoute]
// Foto chega em base64 (~4 MB no máximo); o resto da API fica no limite padrão de 1 MB.
const AVATAR_BODY_LIMIT = 5 * 1024 * 1024

export async function profileRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/profile",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Perfil do usuário autenticado",
                security: bearerSecurity,
                response: { 200: ProfileResponse, 401: errors[401], 404: errors[404] },
            },
        },
        ProfileController.getProfile as any,
    )

    router.patch(
        "/profile",
        {
            onRequest: guardedRoute(),
            config: sensitiveRateLimit,
            schema: {
                tags,
                summary: "Atualiza nome, e-mail ou senha (e-mail e senha exigem a senha atual)",
                security: bearerSecurity,
                body: updateProfileSchema,
                response: {
                    200: UpdateProfileResponse,
                    400: errors[400],
                    401: errors[401],
                    403: errors[403],
                    404: errors[404],
                    409: errors[409],
                    429: errors[429],
                },
            },
        },
        ProfileController.updateProfile as any,
    )

    router.post(
        "/profile/avatar",
        {
            onRequest: guardedRoute(),
            config: uploadRateLimit,
            bodyLimit: AVATAR_BODY_LIMIT,
            schema: {
                tags,
                summary: "Envia a foto de perfil (JPEG/PNG/WebP em base64; é reencodada em WebP 256x256)",
                security: bearerSecurity,
                body: uploadAvatarSchema,
                // 413: corpo acima do bodyLimit (o handleError devolve o mesmo envelope de erro).
                response: { 200: AvatarResponse, 400: errors[400], 401: errors[401], 413: errors[400], 429: errors[429] },
            },
        },
        ProfileController.uploadAvatar as any,
    )

    // Resposta binária (image/webp): sem schema de 200 pra o serializador Zod não tentar converter pra JSON.
    router.get(
        "/profile/avatar",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Baixa a foto de perfil (image/webp)",
                security: bearerSecurity,
                response: { 401: errors[401], 404: errors[404] },
            },
        },
        ProfileController.getAvatar as any,
    )

    router.delete(
        "/profile/avatar",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Remove a foto de perfil",
                security: bearerSecurity,
                response: { 200: successMessageResponse, 401: errors[401] },
            },
        },
        ProfileController.deleteAvatar as any,
    )
}
