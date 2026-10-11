// Cliente Redis nativo do Bun (sem dependência extra). Opcional: sem REDIS_URL o cache fica desligado e a API lê direto do Postgres.
import { RedisClient } from "bun"
import { env } from "../env"
import { logger } from "./logger"

// enableOfflineQueue off: se o Redis cair, o comando falha na hora em vez de enfileirar e travar a request.
export const redis = env.REDIS_URL
    ? new RedisClient(env.REDIS_URL, { enableOfflineQueue: false, connectionTimeout: 3000 })
    : null

if (redis) {
    redis.onconnect = () => logger.info({ event: "redis.connected" })
    redis.onclose = (error) => logger.warn({ event: "redis.closed", error: error?.message })
}

export const closeRedis = () => redis?.close()
