// Cache por usuário sobre o Redis, com fail-open: qualquer erro do Redis cai no loader (Postgres).
// Invalidação por versão: a chave embute um contador por usuário + um global (crons); qualquer escrita
// incrementa o contador e as entradas antigas ficam órfãs até o TTL expirar (sem SCAN/DEL em massa).
import { env } from "../env"
import { logger } from "./logger"
import { redis } from "./redis"

const versionKey = (userId: string) => `eco:cache:v:${userId}`
const globalVersionKey = "eco:cache:v:global"

// Timestamp ISO completo (createdAt, paidAt...) volta como Date, senão o z.date() do serializer rejeita.
// Colunas `date` são YYYY-MM-DD (sem "T"), então não são afetadas.
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const reviveDates = (_key: string, value: unknown) =>
    typeof value === "string" && ISO_TIMESTAMP.test(value) ? new Date(value) : value

const warn = (event: string, error: unknown) =>
    logger.warn({ event, error: error instanceof Error ? error.message : String(error) })

export const cached = async <T>(
    userId: string,
    name: string,
    params: string,
    loader: () => Promise<T>,
    ttlSeconds = env.CACHE_TTL_SECONDS,
): Promise<T> => {
    if (!redis) return loader()

    let key: string
    try {
        const [userVersion, globalVersion] = await Promise.all([redis.get(versionKey(userId)), redis.get(globalVersionKey)])
        key = `eco:cache:${userId}:${globalVersion ?? "0"}.${userVersion ?? "0"}:${name}:${params}`
        const hit = await redis.get(key)
        if (hit !== null) return JSON.parse(hit, reviveDates) as T
    } catch (error) {
        warn("cache.read_failed", error)
        return loader()
    }

    const value = await loader()
    try {
        await redis.set(key, JSON.stringify(value), "EX", ttlSeconds)
    } catch (error) {
        warn("cache.write_failed", error)
    }
    return value
}

// Chamado após toda escrita autenticada bem-sucedida (hook em server.ts).
export const invalidateUserCache = async (userId: string) => {
    if (!redis) return
    try {
        await redis.incr(versionKey(userId))
    } catch (error) {
        warn("cache.invalidate_failed", error)
    }
}

// Chamado pelos crons: eles mexem em dados de vários usuários de uma vez, então invalida tudo.
export const invalidateAllCache = async () => {
    if (!redis) return
    try {
        await redis.incr(globalVersionKey)
    } catch (error) {
        warn("cache.invalidate_failed", error)
    }
}
