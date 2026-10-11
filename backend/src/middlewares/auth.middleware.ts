// Guards de rota: authMiddleware valida o Bearer token, confere no banco se o usuário segue ativo e popula
// req.user; requireSuperAdmin restringe ao super admin.
import { eq } from "drizzle-orm"
import type { FastifyRequest } from "fastify"
import { revokedTokens, users } from "../db/schema"
import { verifyAccessToken } from "../lib/auth"
import { cached } from "../lib/cache"
import { db } from "../lib/db"
import { AppError } from "../lib/errors"
import { isTokenStale } from "../lib/token-staleness"

declare module "fastify" {
    interface FastifyRequest {
        user: { id: string; role: "super_admin" | "user" }
        // Token desta request (jti pode faltar em token antigo): o logout usa pra revogar só esta sessão.
        token: { jti?: string; exp: number }
    }
}

// TTL curto de propósito: rede de segurança caso alguém mude users/revoked_tokens direto no banco.
const AUTH_CACHE_TTL_SECONDS = 60

// Precisa ser async: guard síncrono sem `done` trava a request no Fastify.
// Lança em vez de `reply.send()`: no Bun o Fastify nem sempre percebe a resposta enviada dentro do hook
// e segue pro handler; o throw cai no setErrorHandler e encerra a request de forma garantida.
export const authMiddleware = async (req: FastifyRequest) => {
    const header = req.headers.authorization
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null
    const payload = token ? verifyAccessToken(token) : null
    if (!payload) throw new AppError("Não autenticado", 401)

    // Usuário + revogação numa ida só (em paralelo), cacheados por AUTH_CACHE_TTL_SECONDS. Bloquear/promover/resetar senha
    // (users.service) e logout (hook onSend) invalidam o cache, então o bloqueio continua valendo na hora.
    const { user, revoked } = await cached(
        payload.sub,
        "auth",
        payload.jti ?? "no-jti",
        async () => {
            const [user, revoked] = await Promise.all([
                db.query.users.findFirst({
                    where: eq(users.id, payload.sub),
                    columns: { id: true, role: true, status: true, passwordChangedAt: true },
                }),
                payload.jti
                    ? db.query.revokedTokens.findFirst({ where: eq(revokedTokens.jti, payload.jti), columns: { jti: true } })
                    : undefined,
            ])
            return { user: user ?? null, revoked: !!revoked }
        },
        AUTH_CACHE_TTL_SECONDS,
    )
    if (!user || user.status !== "active") throw new AppError("Não autenticado", 401)
    // Troca/reset de senha invalida os tokens emitidos antes dela (regra em lib/token-staleness).
    if (isTokenStale(payload.iat, user.passwordChangedAt)) {
        throw new AppError("Sessão expirada. Faça login novamente", 401)
    }

    // Logout encerra o token no servidor. Token antigo sem jti não dá pra revogar (expira sozinho em até JWT_EXPIRES_IN).
    if (revoked) throw new AppError("Sessão encerrada. Faça login novamente", 401)

    req.user = { id: user.id, role: user.role }
    req.token = { jti: payload.jti, exp: payload.exp }
}

export const requireSuperAdmin = async (req: FastifyRequest) => {
    if (req.user?.role !== "super_admin") throw new AppError("Acesso restrito ao super admin", 403)
}

export const protectedRoute = [authMiddleware]
export const superAdminRoute = [authMiddleware, requireSuperAdmin]
