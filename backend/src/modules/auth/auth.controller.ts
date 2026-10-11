// Controller de auth: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import * as AuthService from "./auth.service"
import { loginSchema, registerSchema } from "./schemas/auth.schema"

export async function register(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = registerSchema.parse(req.body)
        const result = await AuthService.register(body)
        return reply.status(201).send({ success: true, message: "Conta criada com sucesso", ...result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function login(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = loginSchema.parse(req.body)
        const result = await AuthService.login(body)
        return reply.send({ success: true, message: "Login realizado com sucesso", ...result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function me(req: FastifyRequest, reply: FastifyReply) {
    try {
        const user = await AuthService.getMe(req.user.id)
        return reply.send({ success: true, message: "Usuário autenticado", user })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function logout(req: FastifyRequest, reply: FastifyReply) {
    try {
        await AuthService.logout(req.token)
        return reply.send({ success: true, message: "Você saiu da conta" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
