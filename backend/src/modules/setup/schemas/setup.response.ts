// Schemas de resposta do bootstrap.
import { z } from "zod"
import { UserSchema } from "../../users/schemas/user.response"

export const SetupStatusResponse = z.object({
    success: z.literal(true),
    completed: z.boolean(),
    // Diz ao front se mostra o link "Criar conta" (cadastro público só existe depois do setup e se habilitado).
    signupEnabled: z.boolean(),
})

export const CompleteSetupResponse = z.object({
    success: z.literal(true),
    message: z.string(),
    token: z.string(),
    user: UserSchema,
})
