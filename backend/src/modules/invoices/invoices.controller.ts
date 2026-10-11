// Controller de faturas: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as InvoicesService from "./invoices.service"
import { invoiceQuerySchema, payInvoiceSchema } from "./schemas/invoice.schema"

export async function listInvoices(req: FastifyRequest, reply: FastifyReply) {
    try {
        const query = invoiceQuerySchema.parse(req.query)
        const invoices = await InvoicesService.listInvoices(req.user.id, query)
        return reply.send({ success: true, message: "Faturas listadas", invoices })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function getInvoice(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const invoice = await InvoicesService.getInvoice(req.user.id, id)
        return reply.send({ success: true, message: "Fatura encontrada", invoice })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function payInvoice(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = payInvoiceSchema.parse(req.body ?? {})
        const invoice = await InvoicesService.payInvoice(req.user.id, id, body)
        return reply.send({ success: true, message: "Fatura paga com sucesso", invoice })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
