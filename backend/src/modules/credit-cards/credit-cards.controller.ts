// Controller de cartões: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as CreditCardsService from "./credit-cards.service"
import { createCreditCardSchema, updateCreditCardSchema } from "./schemas/credit-card.schema"

export async function listCreditCards(req: FastifyRequest, reply: FastifyReply) {
    try {
        const creditCards = await CreditCardsService.listCreditCards(req.user.id)
        return reply.send({ success: true, message: "Cartões listados", creditCards })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function getCreditCard(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const creditCard = await CreditCardsService.getCreditCard(req.user.id, id)
        return reply.send({ success: true, message: "Cartão encontrado", creditCard })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createCreditCard(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createCreditCardSchema.parse(req.body)
        const creditCard = await CreditCardsService.createCreditCard(req.user.id, body)
        return reply.status(201).send({ success: true, message: "Cartão criado com sucesso", creditCard })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateCreditCard(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = updateCreditCardSchema.parse(req.body)
        const creditCard = await CreditCardsService.updateCreditCard(req.user.id, id, body)
        return reply.send({ success: true, message: "Cartão atualizado com sucesso", creditCard })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteCreditCard(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        await CreditCardsService.deleteCreditCard(req.user.id, id)
        return reply.send({ success: true, message: "Cartão excluído com sucesso" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
