// Rotas de gestão de usuários: só super admin (lista, cria, bloqueia/desbloqueia, troca papel e senha).
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { superAdminRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema } from "../../schemas/responses"
import { CreateUserResponse, ListUsersResponse, UpdateUserResponse } from "./schemas/user.response"
import { createUserSchema, updateUserSchema } from "./schemas/user.schema"
import * as UsersController from "./users.controller"

const tags = ["Users (super admin)"]

export async function usersRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/users",
        {
            onRequest: superAdminRoute,
            schema: {
                tags,
                summary: "Lista todos os usuários",
                security: bearerSecurity,
                response: { 200: ListUsersResponse, 401: errors[401], 403: errors[403] },
            },
        },
        UsersController.listUsers as any,
    )

    router.post(
        "/users",
        {
            onRequest: superAdminRoute,
            schema: {
                tags,
                summary: "Cria um usuário (com categorias padrão)",
                security: bearerSecurity,
                body: createUserSchema,
                response: { 201: CreateUserResponse, 400: errors[400], 401: errors[401], 403: errors[403], 409: errors[409] },
            },
        },
        UsersController.createUser as any,
    )

    router.patch(
        "/users/:id",
        {
            onRequest: superAdminRoute,
            schema: {
                tags,
                summary: "Atualiza nome, papel, status (bloquear) ou senha de um usuário",
                security: bearerSecurity,
                params: idParamSchema,
                body: updateUserSchema,
                response: {
                    200: UpdateUserResponse,
                    400: errors[400],
                    401: errors[401],
                    403: errors[403],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        UsersController.updateUser as any,
    )
}
