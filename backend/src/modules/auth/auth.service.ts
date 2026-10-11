// Regras de cadastro/login: cadastro público só depois do /setup (e se ALLOW_PUBLIC_SIGNUP); login recusa bloqueado.
import { eq, lt } from "drizzle-orm"
import { revokedTokens, users } from "../../db/schema"
import { env } from "../../env"
import { hashPassword, signAccessToken, verifyPassword } from "../../lib/auth"
import { db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import { isSetupCompleted } from "../setup/setup.service"
import { assertEmailAvailable, createUserAccount, toPublicUser } from "../users/users.service"
import type { LoginInput, RegisterInput } from "./schemas/auth.schema"

export const register = async (input: RegisterInput) => {
    // Antes do setup, a primeira conta tem que ser o super admin (via /setup), nunca um cadastro comum.
    if (!(await isSetupCompleted())) throw new AppError("Conclua a configuração inicial antes de criar contas", 403)
    if (!env.ALLOW_PUBLIC_SIGNUP) throw new AppError("Cadastro desativado. Peça uma conta ao administrador", 403)

    await assertEmailAvailable(input.email)
    const passwordHash = await hashPassword(input.password)
    const user = await db.transaction((tx) =>
        createUserAccount(tx, { name: input.name, email: input.email, passwordHash, role: "user" }),
    )

    return { token: signAccessToken(user.id), user: toPublicUser(user) }
}

export const login = async (input: LoginInput) => {
    const user = await db.query.users.findFirst({ where: eq(users.email, input.email) })
    // Mesma mensagem pra e-mail inexistente e senha errada (não revela quem tem conta).
    const valid = user ? await verifyPassword(user.passwordHash, input.password) : false
    if (!user || !valid) throw new AppError("E-mail ou senha inválidos", 401)
    // Só depois da senha certa: bloqueio não vira oráculo de "esse e-mail existe".
    if (user.status !== "active") throw new AppError("Sua conta está bloqueada. Fale com o administrador", 403)

    return { token: signAccessToken(user.id), user: toPublicUser(user) }
}

export const getMe = async (userId: string) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw new AppError("Usuário não encontrado", 404)
    return toPublicUser(user)
}

// Encerra só a sessão desta request: o jti entra na lista de revogados até o token expirar. Idempotente (chamar de novo
// não falha). Token antigo sem jti não tem o que revogar; o front descarta do mesmo jeito.
export const logout = async (token: { jti?: string; exp: number }) => {
    // Limpeza oportunista: linha de token que já expirou não protege mais nada.
    await db.delete(revokedTokens).where(lt(revokedTokens.expiresAt, new Date()))
    if (!token.jti) return
    await db
        .insert(revokedTokens)
        .values({ jti: token.jti, expiresAt: new Date(token.exp * 1000) })
        .onConflictDoNothing({ target: revokedTokens.jti })
}
