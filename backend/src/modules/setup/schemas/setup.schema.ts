// Schema de entrada do bootstrap (POST /setup).
import { z } from "zod"
import { emailSchema, nameSchema, passwordSchema } from "../../users/schemas/user.schema"

export const completeSetupSchema = z.object({
    setupToken: z.string().min(1, "Informe o token de configuração"),
    name: nameSchema(),
    email: emailSchema(),
    password: passwordSchema(),
})

export type CompleteSetupInput = z.infer<typeof completeSetupSchema>
