// Cron de mensalidades/assinaturas: gera os lançamentos das recorrências que vencem até hoje + RECURRING_LEAD_DAYS.
import { and, eq, lte } from "drizzle-orm"
import { recurringTransactions } from "../db/schema"
import { db } from "../lib/db"
import { logger } from "../lib/logger"
import { generateDueOccurrences, horizonFrom } from "../modules/recurring-transactions/recurring-transactions.service"
import type { JobDefinition } from "./job-runner"

export const recurringTransactionsJob: JobDefinition = {
    name: "recurring-transactions",
    description: "Gera lançamentos de recorrências (mensalidades, assinaturas, salário)",
    schedule: "5 0 * * *",
    run: async ({ today }) => {
        const horizon = horizonFrom(today)
        const due = await db.query.recurringTransactions.findMany({
            where: and(eq(recurringTransactions.active, true), lte(recurringTransactions.nextRunDate, horizon)),
        })

        let generated = 0
        let failed = 0
        // Uma recorrência com erro não pode impedir as outras de rodarem.
        for (const recurring of due) {
            try {
                generated += await generateDueOccurrences(recurring, horizon, today)
            } catch (error) {
                failed++
                logger.error({ event: "recurring_generation_failed", recurringId: recurring.id, err: error })
            }
        }

        if (failed > 0) throw new Error(`${failed} recorrência(s) falharam; ${generated} lançamento(s) gerados`)
        return { recurrences: due.length, generated }
    },
}
