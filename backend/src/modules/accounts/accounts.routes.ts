// Rotas HTTP de contas, todas autenticadas e escopadas pelo usuário do token.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema, successMessageResponse } from "../../schemas/responses"
import * as AccountsController from "./accounts.controller"
import {
    CreateAccountResponse,
    GetAccountResponse,
    ListAccountsResponse,
    UpdateAccountResponse,
} from "./schemas/account.response"
import { createAccountSchema, updateAccountSchema } from "./schemas/account.schema"

const tags = ["Accounts"]

export async function accountsRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/accounts",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista contas com saldo",
                security: bearerSecurity,
                response: { 200: ListAccountsResponse, 401: errors[401] },
            },
        },
        AccountsController.listAccounts as any,
    )

    router.get(
        "/accounts/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Detalha uma conta",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: GetAccountResponse, 401: errors[401], 404: errors[404] },
            },
        },
        AccountsController.getAccount as any,
    )

    router.post(
        "/accounts",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Cria uma conta",
                security: bearerSecurity,
                body: createAccountSchema,
                response: { 201: CreateAccountResponse, 400: errors[400], 401: errors[401] },
            },
        },
        AccountsController.createAccount as any,
    )

    router.patch(
        "/accounts/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Atualiza uma conta",
                security: bearerSecurity,
                params: idParamSchema,
                body: updateAccountSchema,
                response: { 200: UpdateAccountResponse, 400: errors[400], 401: errors[401], 404: errors[404] },
            },
        },
        AccountsController.updateAccount as any,
    )

    router.delete(
        "/accounts/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Exclui uma conta sem lançamentos",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: successMessageResponse, 401: errors[401], 404: errors[404], 409: errors[409] },
            },
        },
        AccountsController.deleteAccount as any,
    )
}
