// Controller de categorias: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as CategoriesService from "./categories.service"
import { categoryQuerySchema, createCategorySchema, updateCategorySchema } from "./schemas/category.schema"

export async function listCategories(req: FastifyRequest, reply: FastifyReply) {
    try {
        const query = categoryQuerySchema.parse(req.query)
        const categories = await CategoriesService.listCategories(req.user.id, query)
        return reply.send({ success: true, message: "Categorias listadas", categories })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createCategory(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createCategorySchema.parse(req.body)
        const category = await CategoriesService.createCategory(req.user.id, body)
        return reply.status(201).send({ success: true, message: "Categoria criada com sucesso", category })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateCategory(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = updateCategorySchema.parse(req.body)
        const category = await CategoriesService.updateCategory(req.user.id, id, body)
        return reply.send({ success: true, message: "Categoria atualizada com sucesso", category })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteCategory(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        await CategoriesService.deleteCategory(req.user.id, id)
        return reply.send({ success: true, message: "Categoria excluída com sucesso" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
