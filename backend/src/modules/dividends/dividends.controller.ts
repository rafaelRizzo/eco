// Controller de proventos: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as DividendsService from "./dividends.service"
import {
    createDividendSchema,
    listDividendsQuerySchema,
    updateDividendSchema,
    upcomingDividendsQuerySchema,
} from "./schemas/dividend.schema"

export async function listDividends(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { month } = listDividendsQuerySchema.parse(req.query)
        const result = await DividendsService.listMonth(req.user.id, month)
        return reply.send({ success: true, message: "Proventos listados", ...result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function listUpcoming(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { months } = upcomingDividendsQuerySchema.parse(req.query)
        const result = await DividendsService.listUpcoming(req.user.id, months)
        return reply.send({ success: true, message: "Proventos por mês", months: result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createDividend(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createDividendSchema.parse(req.body)
        const dividend = await DividendsService.createDividend(req.user.id, body)
        return reply.status(201).send({ success: true, message: "Provento registrado com sucesso", dividend })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateDividend(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = updateDividendSchema.parse(req.body)
        const dividend = await DividendsService.updateDividend(req.user.id, id, body)
        return reply.send({ success: true, message: "Provento atualizado com sucesso", dividend })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteDividend(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        await DividendsService.deleteDividend(req.user.id, id)
        return reply.send({ success: true, message: "Provento excluído com sucesso" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
