// Entry point: sobe o HTTP, inicia os crons e faz shutdown gracioso (para crons -> fecha HTTP -> fecha pool).
import { env } from "./env"
import { startScheduler, stopScheduler } from "./jobs/scheduler"
import { sql } from "./lib/db"
import { closeRedis } from "./lib/redis"
import { buildApp } from "./server"

const app = await buildApp()

await app.listen({ port: env.PORT, host: env.HOST })
startScheduler()

const shutdown = async (signal: string) => {
    app.log.info({ event: "shutdown", signal })
    stopScheduler()
    await app.close()
    closeRedis()
    await sql.end({ timeout: 5 })
    process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))
