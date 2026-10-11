// Controller de usuários (super admin): valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import { createUserSchema, updateUserSchema } from "./schemas/user.schema"
import * as UsersService from "./users.service"

export async function listUsers(req: FastifyRequest, reply: FastifyReply) {
    try {
        const users = await UsersService.listUsers()
        return reply.send({ success: true, message: "Usuários listados", users })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createUser(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createUserSchema.parse(req.body)
        const user = await UsersService.createUser(body)
        return reply.status(201).send({ success: true, message: "Usuário criado com sucesso", user })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateUser(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = updateUserSchema.parse(req.body)
        const user = await UsersService.updateUser(req.user.id, id, body)
        return reply.send({ success: true, message: "Usuário atualizado com sucesso", user })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
