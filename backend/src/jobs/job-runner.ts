// Executor de jobs: "reserva" a janela (job_name, run_key) no Postgres antes de rodar, então com N réplicas
// só uma executa cada janela. Janela com status failed (ou running travado há mais de 1h) pode ser retomada.
import { sql } from "drizzle-orm"
import { jobRuns } from "../db/schema"
import { invalidateAllCache } from "../lib/cache"
import { db } from "../lib/db"
import { logger } from "../lib/logger"

export type JobContext = { today: string; runKey: string }
export type JobResult = Record<string, number>

export type JobDefinition = {
    name: string
    description: string
    // Expressão cron avaliada no fuso APP_TIMEZONE.
    schedule: string
    run: (ctx: JobContext) => Promise<JobResult>
}

const claimRun = async (jobName: string, runKey: string) => {
    const [claimed] = await db
        .insert(jobRuns)
        .values({ jobName, runKey })
        .onConflictDoUpdate({
            target: [jobRuns.jobName, jobRuns.runKey],
            set: { status: "running", startedAt: sql`now()`, finishedAt: null, error: null, result: null },
            setWhere: sql`${jobRuns.status} = 'failed' or (${jobRuns.status} = 'running' and ${jobRuns.startedAt} < now() - interval '1 hour')`,
        })
        .returning({ id: jobRuns.id })
    return claimed?.id ?? null
}

export const runJob = async (job: JobDefinition, ctx: JobContext) => {
    const runId = await claimRun(job.name, ctx.runKey)
    if (!runId) {
        logger.info({ event: "job_skipped", job: job.name, runKey: ctx.runKey }, "janela já executada")
        return { status: "skipped" as const }
    }

    const startedAt = Date.now()
    logger.info({ event: "job_started", job: job.name, runKey: ctx.runKey })

    try {
        const result = await job.run(ctx)
        await invalidateAllCache()
        await db
            .update(jobRuns)
            .set({ status: "success", finishedAt: new Date(), result })
            .where(sql`${jobRuns.id} = ${runId}`)
        logger.info({ event: "job_finished", job: job.name, runKey: ctx.runKey, ms: Date.now() - startedAt, result })
        return { status: "success" as const, result }
    } catch (error) {
        const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
        await db
            .update(jobRuns)
            .set({ status: "failed", finishedAt: new Date(), error: message })
            .where(sql`${jobRuns.id} = ${runId}`)
        await invalidateAllCache() // falha pode ter deixado escrita parcial
        logger.error({ event: "job_failed", job: job.name, runKey: ctx.runKey, err: error })
        return { status: "failed" as const, error: message }
    }
}
