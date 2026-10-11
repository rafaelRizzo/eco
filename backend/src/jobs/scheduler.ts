// Agenda os jobs com croner no fuso APP_TIMEZONE; opcionalmente roda todos no boot pra recuperar
// janelas perdidas enquanto o servidor estava fora (a reserva em job_runs evita execução duplicada).
import { Cron } from "croner"
import { env } from "../env"
import { todayIn } from "../lib/dates"
import { logger } from "../lib/logger"
import { jobs } from "./index"
import { type JobDefinition, runJob } from "./job-runner"

const crons: Cron[] = []

const contextFor = () => {
    const today = todayIn(env.APP_TIMEZONE)
    return { today, runKey: today }
}

// Erro de infra (ex: banco fora) antes/depois do job não pode derrubar o processo.
const runSafely = async (job: JobDefinition) => {
    try {
        await runJob(job, contextFor())
    } catch (error) {
        logger.error({ event: "job_crashed", job: job.name, err: error })
    }
}

export const runAllJobs = async () => {
    for (const job of jobs) await runSafely(job)
}

export const startScheduler = () => {
    if (!env.JOBS_ENABLED) {
        logger.info({ event: "scheduler_disabled" })
        return
    }

    for (const job of jobs) {
        // protect: não sobrepõe execução se a anterior ainda estiver rodando.
        crons.push(new Cron(job.schedule, { timezone: env.APP_TIMEZONE, protect: true, name: job.name }, () => runSafely(job)))
    }
    logger.info({
        event: "scheduler_started",
        timezone: env.APP_TIMEZONE,
        jobs: jobs.map((job) => ({ name: job.name, schedule: job.schedule })),
    })

    if (env.JOBS_RUN_ON_BOOT) void runAllJobs()
}

export const stopScheduler = () => {
    for (const cron of crons) cron.stop()
    crons.length = 0
}
