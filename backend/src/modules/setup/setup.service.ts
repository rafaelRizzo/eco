// Bootstrap: cria o primeiro super admin uma única vez, protegido por SETUP_TOKEN.
// A reserva da linha única em system_setup e a criação do usuário são uma transaction só: ou os dois
// acontecem ou nenhum, e um segundo /setup concorrente esbarra na PK e recebe 409.
import { eq } from "drizzle-orm"
import { SYSTEM_SETUP_ID, systemSetup } from "../../db/schema"
import { env } from "../../env"
import { hashPassword, signAccessToken, timingSafeEqualStrings } from "../../lib/auth"
import { db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import { assertEmailAvailable, createUserAccount, toPublicUser } from "../users/users.service"
import type { CompleteSetupInput } from "./schemas/setup.schema"

export const isSetupCompleted = async () => {
    const row = await db.query.systemSetup.findFirst({
        where: eq(systemSetup.id, SYSTEM_SETUP_ID),
        columns: { id: true },
    })
    return !!row
}

export const completeSetup = async (input: CompleteSetupInput) => {
    if (await isSetupCompleted()) throw new AppError("A configuração inicial já foi concluída", 409)
    if (!timingSafeEqualStrings(input.setupToken, env.SETUP_TOKEN)) {
        throw new AppError("Token de configuração inválido", 403)
    }

    const passwordHash = await hashPassword(input.password)

    const user = await db.transaction(async (tx) => {
        const [claimed] = await tx.insert(systemSetup).values({ id: SYSTEM_SETUP_ID }).onConflictDoNothing().returning()
        if (!claimed) throw new AppError("A configuração inicial já foi concluída", 409)

        await assertEmailAvailable(input.email, tx)
        const created = await createUserAccount(tx, {
            name: input.name,
            email: input.email,
            passwordHash,
            role: "super_admin",
        })
        await tx.update(systemSetup).set({ superAdminId: created.id }).where(eq(systemSetup.id, SYSTEM_SETUP_ID))
        return created
    })

    // Já sai logado: o próximo passo natural é usar o app.
    return { token: signAccessToken(user.id), user: toPublicUser(user) }
}
