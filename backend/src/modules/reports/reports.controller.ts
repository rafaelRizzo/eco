// Controller de relatórios: valida query, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import * as ReportsService from "./reports.service"
import { summaryQuerySchema, upcomingQuerySchema } from "./schemas/report.schema"

export async function getMonthlySummary(req: FastifyRequest, reply: FastifyReply) {
    try {
        const query = summaryQuerySchema.parse(req.query)
        const summary = await ReportsService.getMonthlySummary(req.user.id, query)
        return reply.send({ success: true, message: "Resumo do mês", summary })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function getUpcoming(req: FastifyRequest, reply: FastifyReply) {
    try {
        const query = upcomingQuerySchema.parse(req.query)
        const result = await ReportsService.getUpcoming(req.user.id, query)
        return reply.send({ success: true, message: "Próximos vencimentos", ...result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
