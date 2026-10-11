// Controller do bootstrap: status público e criação do primeiro super admin.
import type { FastifyReply, FastifyRequest } from "fastify"
import { env } from "../../env"
import { handleError } from "../../lib/errors"
import { completeSetupSchema } from "./schemas/setup.schema"
import * as SetupService from "./setup.service"

export async function getSetupStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
        const completed = await SetupService.isSetupCompleted()
        return reply.send({ success: true, completed, signupEnabled: completed && env.ALLOW_PUBLIC_SIGNUP })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function completeSetup(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = completeSetupSchema.parse(req.body)
        const result = await SetupService.completeSetup(body)
        req.log.info({ event: "setup_completed", userId: result.user.id })
        return reply.status(201).send({ success: true, message: "Configuração concluída. Bem-vindo!", ...result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
