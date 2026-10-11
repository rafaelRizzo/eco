// Schemas de entrada dos relatórios.
import { z } from "zod"
import { monthString } from "../../../schemas/responses"

export const summaryQuerySchema = z.object({
    // Sem month usa o mês atual (no fuso APP_TIMEZONE).
    month: monthString().optional(),
})

export const upcomingQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(90).default(30),
})

export type SummaryQuery = z.infer<typeof summaryQuerySchema>
export type UpcomingQuery = z.infer<typeof upcomingQuerySchema>
