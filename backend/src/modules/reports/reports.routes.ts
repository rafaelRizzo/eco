// Rotas HTTP de relatórios (dashboard), todas autenticadas.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors } from "../../schemas/responses"
import * as ReportsController from "./reports.controller"
import { MonthlySummaryResponse, UpcomingResponse } from "./schemas/report.response"
import { summaryQuerySchema, upcomingQuerySchema } from "./schemas/report.schema"

const tags = ["Reports"]

export async function reportsRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/reports/summary",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Resumo do mês: receitas, despesas, saldo e gasto por categoria",
                security: bearerSecurity,
                querystring: summaryQuerySchema,
                response: { 200: MonthlySummaryResponse, 400: errors[400], 401: errors[401] },
            },
        },
        ReportsController.getMonthlySummary as any,
    )

    router.get(
        "/reports/upcoming",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Contas e faturas a vencer (inclui atrasadas)",
                security: bearerSecurity,
                querystring: upcomingQuerySchema,
                response: { 200: UpcomingResponse, 400: errors[400], 401: errors[401] },
            },
        },
        ReportsController.getUpcoming as any,
    )
}
