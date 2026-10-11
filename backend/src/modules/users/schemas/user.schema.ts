// Schemas de entrada da gestão de usuários (só super admin).
import { z } from "zod"
import { userRoleValues, userStatusValues } from "../../../db/schema"

export const emailSchema = () => z.string().trim().toLowerCase().pipe(z.email("E-mail inválido"))
export const passwordSchema = () => z.string().min(8, "Senha precisa ter ao menos 8 caracteres").max(128)
export const nameSchema = () => z.string().trim().min(2, "Nome muito curto").max(120)

export const createUserSchema = z.object({
    name: nameSchema(),
    email: emailSchema(),
    password: passwordSchema(),
    role: z.enum(userRoleValues).default("user"),
})

// E-mail não muda por aqui (é a identidade do login); senha nova é um reset feito pelo admin.
export const updateUserSchema = z
    .object({
        name: nameSchema(),
        role: z.enum(userRoleValues),
        status: z.enum(userStatusValues),
        password: passwordSchema(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo")

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
