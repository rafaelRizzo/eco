// Estado interno dos crons (sem user_id de propósito): uma linha por job por janela (run_key).
// A unique (job_name, run_key) garante que só uma réplica executa cada janela.
import { jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { id } from "../columns"
import { jobRunStatus } from "../enums"

export const jobRuns = pgTable(
    "job_runs",
    {
        id: id(),
        jobName: varchar("job_name", { length: 80 }).notNull(),
        runKey: varchar("run_key", { length: 80 }).notNull(),
        status: jobRunStatus("status").notNull().default("running"),
        startedAt: timestamp("started_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
        finishedAt: timestamp("finished_at", { withTimezone: true, precision: 3 }),
        result: jsonb("result"),
        error: text("error"),
    },
    (table) => [uniqueIndex("job_runs_job_name_run_key_unique").on(table.jobName, table.runKey)],
)

export type JobRun = typeof jobRuns.$inferSelect
