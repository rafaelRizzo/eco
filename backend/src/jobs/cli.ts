// Executa um job manualmente: `bun run job <nome|all> [--force] [--date=YYYY-MM-DD]`.
// --force usa uma janela nova (ignora se o job já rodou hoje); --date simula outro "hoje".
import { env } from "../env"
import { todayIn } from "../lib/dates"
import { sql } from "../lib/db"
import { findJob, jobs } from "./index"
import { runJob } from "./job-runner"

const [name, ...flags] = process.argv.slice(2)
const force = flags.includes("--force")
const dateFlag = flags.find((flag) => flag.startsWith("--date="))?.slice("--date=".length)

if (!name) {
    console.log("Uso: bun run job <nome|all> [--force] [--date=YYYY-MM-DD]\n\nJobs:")
    for (const job of jobs) console.log(`  ${job.name.padEnd(24)} ${job.schedule.padEnd(12)} ${job.description}`)
    process.exit(0)
}

const selected = name === "all" ? jobs : [findJob(name)].filter((job) => !!job)
if (selected.length === 0) {
    console.error(`Job desconhecido: ${name}`)
    process.exit(1)
}

const today = dateFlag ?? todayIn(env.APP_TIMEZONE)
const runKey = force ? `manual:${new Date().toISOString()}` : today

let failed = false
for (const job of selected) {
    const outcome = await runJob(job, { today, runKey })
    console.log(job.name, outcome)
    if (outcome.status === "failed") failed = true
}

await sql.end()
process.exit(failed ? 1 : 0)
