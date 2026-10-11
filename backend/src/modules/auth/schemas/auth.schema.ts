// Schemas de entrada de cadastro e login.
import { z } from "zod"

const email = () => z.string().trim().toLowerCase().pipe(z.email("E-mail inválido"))

export const registerSchema = z.object({
    name: z.string().trim().min(2, "Nome muito curto").max(120),
    email: email(),
    password: z.string().min(8, "Senha precisa ter ao menos 8 caracteres").max(128),
})

export const loginSchema = z.object({
    email: email(),
    password: z.string().min(1, "Informe a senha"),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
