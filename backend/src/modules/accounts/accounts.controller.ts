// Controller de contas: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as AccountsService from "./accounts.service"
import { createAccountSchema, updateAccountSchema } from "./schemas/account.schema"

export async function listAccounts(req: FastifyRequest, reply: FastifyReply) {
    try {
        const accounts = await AccountsService.listAccounts(req.user.id)
        return reply.send({ success: true, message: "Contas listadas", accounts })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function getAccount(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const account = await AccountsService.getAccount(req.user.id, id)
        return reply.send({ success: true, message: "Conta encontrada", account })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createAccount(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createAccountSchema.parse(req.body)
        const account = await AccountsService.createAccount(req.user.id, body)
        return reply.status(201).send({ success: true, message: "Conta criada com sucesso", account })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateAccount(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = updateAccountSchema.parse(req.body)
        const account = await AccountsService.updateAccount(req.user.id, id, body)
        return reply.send({ success: true, message: "Conta atualizada com sucesso", account })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteAccount(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        await AccountsService.deleteAccount(req.user.id, id)
        return reply.send({ success: true, message: "Conta excluída com sucesso" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
