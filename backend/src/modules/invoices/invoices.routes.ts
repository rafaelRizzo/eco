// Rotas HTTP de faturas: faturas são criadas automaticamente pelos lançamentos/cron, aqui só leitura e pagamento.
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { protectedRoute } from "../../middlewares/auth.middleware"
import { bearerSecurity, errors, idParamSchema } from "../../schemas/responses"
import * as InvoicesController from "./invoices.controller"
import { GetInvoiceResponse, ListInvoicesResponse, PayInvoiceResponse } from "./schemas/invoice.response"
import { invoiceQuerySchema, payInvoiceSchema } from "./schemas/invoice.schema"

const tags = ["Invoices"]

export async function invoicesRoutes(app: FastifyInstance) {
    const router = app.withTypeProvider<ZodTypeProvider>()

    router.get(
        "/invoices",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Lista faturas (filtro por cartão/status)",
                security: bearerSecurity,
                querystring: invoiceQuerySchema,
                response: { 200: ListInvoicesResponse, 400: errors[400], 401: errors[401] },
            },
        },
        InvoicesController.listInvoices as any,
    )

    router.get(
        "/invoices/:id",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Detalha uma fatura com seus lançamentos",
                security: bearerSecurity,
                params: idParamSchema,
                response: { 200: GetInvoiceResponse, 401: errors[401], 404: errors[404] },
            },
        },
        InvoicesController.getInvoice as any,
    )

    router.post(
        "/invoices/:id/pay",
        {
            onRequest: protectedRoute,
            schema: {
                tags,
                summary: "Paga a fatura (debita da conta e quita os lançamentos)",
                security: bearerSecurity,
                params: idParamSchema,
                body: payInvoiceSchema.optional(),
                response: {
                    200: PayInvoiceResponse,
                    400: errors[400],
                    401: errors[401],
                    404: errors[404],
                    409: errors[409],
                },
            },
        },
        InvoicesController.payInvoice as any,
    )
}
