// Rotas HTTP de categorias, todas autenticadas.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema, successMessageResponse } from "../../schemas/responses"
import * as CategoriesController from "./categories.controller"
import { CreateCategoryResponse, ListCategoriesResponse, UpdateCategoryResponse } from "./schemas/category.response"
import { categoryQuerySchema, createCategorySchema, updateCategorySchema } from "./schemas/category.schema"

const tags = ["Categories"]

export async function categoriesRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/categories",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista categorias",
                security: bearerSecurity,
                querystring: categoryQuerySchema,
                response: { 200: ListCategoriesResponse, 400: errors[400], 401: errors[401] },
            },
        },
        CategoriesController.listCategories as any,
    )

    router.post(
        "/categories",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Cria uma categoria",
                security: bearerSecurity,
                body: createCategorySchema,
                response: { 201: CreateCategoryResponse, 400: errors[400], 401: errors[401], 409: errors[409] },
            },
        },
        CategoriesController.createCategory as any,
    )

    router.patch(
        "/categories/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Atualiza uma categoria",
                security: bearerSecurity,
                params: idParamSchema,
                body: updateCategorySchema,
                response: {
                    200: UpdateCategoryResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        CategoriesController.updateCategory as any,
    )

    router.delete(
        "/categories/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Exclui uma categoria (lançamentos ficam sem categoria)",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: successMessageResponse, 401: errors[401], 404: errors[404] },
            },
        },
        CategoriesController.deleteCategory as any,
    )
}
