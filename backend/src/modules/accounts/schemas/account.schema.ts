// Schemas de entrada de contas.
import { z } from "zod"
import { accountTypeValues } from "../../../db/schema"
import { cents } from "../../../schemas/responses"

export const createAccountSchema = z.object({
    name: z.string().trim().min(1, "Informe o nome").max(80),
    type: z.enum(accountTypeValues).default("checking"),
    initialBalanceCents: cents().default(0),
})

export const updateAccountSchema = createAccountSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo")

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
