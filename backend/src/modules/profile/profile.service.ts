// Regras do perfil do próprio usuário: tudo escopado pelo userId do token (não há :id), então não dá pra mexer em outra conta.
import { eq } from "drizzle-orm"
import { userAvatars, users } from "../../db/schema"
import { hashPassword, signAccessToken, verifyPassword } from "../../lib/auth"
import { cached, invalidateAllCache } from "../../lib/cache"
import { db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import { assertEmailAvailable, toPublicUser } from "../users/users.service"
import { processAvatarImage } from "./avatar-image"
import type { UpdateProfileInput, UploadAvatarInput } from "./schemas/profile.schema"

const findUser = async (userId: string) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw new AppError("Usuário não encontrado", 404)
    return user
}

export const getProfile = (userId: string) => cached(userId, "profile", "me", async () => toPublicUser(await findUser(userId)))

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
    const user = await findUser(userId)
    const changes: Partial<typeof users.$inferInsert> = {}

    if (input.name !== undefined) changes.name = input.name

    const changesEmail = input.email !== undefined && input.email !== user.email
    const changesPassword = input.newPassword !== undefined

    // E-mail e senha são a identidade/credencial da conta: exigem a senha atual. 403 (e não 401) de propósito,
    // porque o front derruba a sessão em qualquer 401 e senha errada não pode deslogar o usuário.
    if (changesEmail || changesPassword) {
        if (!input.currentPassword) throw new AppError("Informe a senha atual para alterar e-mail ou senha", 400)
        if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
            throw new AppError("Senha atual incorreta", 403)
        }
    }

    if (changesEmail) {
        await assertEmailAvailable(input.email!)
        changes.email = input.email
    }

    if (changesPassword) {
        if (await verifyPassword(user.passwordHash, input.newPassword!)) {
            throw new AppError("A nova senha precisa ser diferente da atual", 400)
        }
        changes.passwordHash = await hashPassword(input.newPassword!)
        changes.passwordChangedAt = new Date()
    }

    const [updated] = await db.update(users).set(changes).where(eq(users.id, userId)).returning()
    await invalidateAllCache() // lista de /users mostra nome/e-mail
    return {
        user: toPublicUser(updated!),
        // Token novo só quando a senha mudou: o anterior (e o das outras sessões) é invalidado pelo middleware.
        token: changesPassword ? signAccessToken(userId) : undefined,
    }
}

export const setAvatar = async (userId: string, input: UploadAvatarInput) => {
    const data = await processAvatarImage(Buffer.from(input.image, "base64"))
    const now = new Date()

    await db.transaction(async (tx) => {
        await tx
            .insert(userAvatars)
            .values({ userId, contentType: "image/webp", data, updatedAt: now })
            .onConflictDoUpdate({ target: userAvatars.userId, set: { contentType: "image/webp", data, updatedAt: now } })
        await tx.update(users).set({ avatarUpdatedAt: now }).where(eq(users.id, userId))
    })
    await invalidateAllCache()

    return now
}

export const getAvatar = async (userId: string) => {
    const avatar = await db.query.userAvatars.findFirst({ where: eq(userAvatars.userId, userId) })
    if (!avatar) throw new AppError("Você ainda não tem foto de perfil", 404)
    return avatar
}

export const deleteAvatar = async (userId: string) => {
    await db.transaction(async (tx) => {
        await tx.delete(userAvatars).where(eq(userAvatars.userId, userId))
        await tx.update(users).set({ avatarUpdatedAt: null }).where(eq(users.id, userId))
    })
    await invalidateAllCache()
}
