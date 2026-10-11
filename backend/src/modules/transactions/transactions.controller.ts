// Controller de lançamentos: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import {
    createTransactionSchema,
    deleteTransactionQuerySchema,
    payTransactionSchema,
    transactionQuerySchema,
    updateTransactionSchema,
} from "./schemas/transaction.schema"
import * as TransactionsService from "./transactions.service"

export async function listTransactions(req: FastifyRequest, reply: FastifyReply) {
    try {
        const query = transactionQuerySchema.parse(req.query)
        const transactions = await TransactionsService.listTransactions(req.user.id, query)
        return reply.send({ success: true, message: "Lançamentos listados", transactions })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function getTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const transaction = await TransactionsService.getTransaction(req.user.id, id)
        return reply.send({ success: true, message: "Lançamento encontrado", transaction })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createTransactionSchema.parse(req.body)
        const transactions = await TransactionsService.createTransaction(req.user.id, body)
        const message = transactions.length > 1 ? `${transactions.length} parcelas criadas` : "Lançamento criado"
        return reply.status(201).send({ success: true, message, transactions })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = updateTransactionSchema.parse(req.body)
        const transaction = await TransactionsService.updateTransaction(req.user.id, id, body)
        return reply.send({ success: true, message: "Lançamento atualizado", transaction })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function payTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = payTransactionSchema.parse(req.body ?? {})
        const transaction = await TransactionsService.payTransaction(req.user.id, id, body)
        return reply.send({ success: true, message: "Lançamento marcado como pago", transaction })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteTransaction(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const query = deleteTransactionQuerySchema.parse(req.query)
        const deletedCount = await TransactionsService.deleteTransaction(req.user.id, id, query)
        return reply.send({ success: true, message: "Lançamento excluído", deletedCount })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
