// Controller de recorrências: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as RecurringTransactionsService from "./recurring-transactions.service"
import {
    createRecurringTransactionSchema,
    recurringTransactionQuerySchema,
    updateRecurringTransactionSchema,
} from "./schemas/recurring-transaction.schema"

export async function listRecurringTransactions(req: FastifyRequest, reply: FastifyReply) {
    try {
        const query = recurringTransactionQuerySchema.parse(req.query)
        const recurringTransactions = await RecurringTransactionsService.listRecurringTransactions(req.user.id, query)
        return reply.send({ success: true, message: "Recorrências listadas", recurringTransactions })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function getRecurringTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const recurringTransaction = await RecurringTransactionsService.getRecurringTransaction(req.user.id, id)
        return reply.send({ success: true, message: "Recorrência encontrada", recurringTransaction })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createRecurringTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createRecurringTransactionSchema.parse(req.body)
        const recurringTransaction = await RecurringTransactionsService.createRecurringTransaction(req.user.id, body)
        return reply.status(201).send({ success: true, message: "Recorrência criada com sucesso", recurringTransaction })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateRecurringTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = updateRecurringTransactionSchema.parse(req.body)
        const recurringTransaction = await RecurringTransactionsService.updateRecurringTransaction(
            req.user.id,
            id,
            body,
        )
        return reply.send({ success: true, message: "Recorrência atualizada com sucesso", recurringTransaction })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteRecurringTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        await RecurringTransactionsService.deleteRecurringTransaction(req.user.id, id)
        return reply.send({ success: true, message: "Recorrência excluída com sucesso" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
