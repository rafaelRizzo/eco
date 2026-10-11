// Schemas de resposta de auth: usuário público (nunca passwordHash) + token.
import { z } from "zod"
import { UserSchema } from "../../users/schemas/user.response"

export { UserSchema }

export const AuthResponse = z.object({
    success: z.literal(true),
    message: z.string(),
    token: z.string(),
    user: UserSchema,
})

export const MeResponse = z.object({
    success: z.literal(true),
    message: z.string(),
    user: UserSchema,
})
