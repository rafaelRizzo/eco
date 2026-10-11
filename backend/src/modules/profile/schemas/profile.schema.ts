// Schemas de entrada do perfil do próprio usuário (nome, e-mail, senha e foto).
import { z } from "zod"
import { emailSchema, nameSchema, passwordSchema } from "../../users/schemas/user.schema"

// Role/status não existem aqui de propósito: o usuário não consegue se promover nem se desbloquear pelo perfil.
export const updateProfileSchema = z
    .object({
        name: nameSchema(),
        email: emailSchema(),
        // Exigida pra trocar e-mail ou senha (confirma que quem está na sessão é o dono da conta).
        currentPassword: z.string().min(1, "Informe a senha atual").max(128),
        newPassword: passwordSchema(),
    })
    .partial()
    .refine(
        (data) => data.name !== undefined || data.email !== undefined || data.newPassword !== undefined,
        "Informe ao menos um campo",
    )

// Imagem em base64 puro (sem o prefixo "data:"); limite de ~3 MB decodificado = ~4 MB em base64.
export const uploadAvatarSchema = z.object({
    image: z
        .string()
        .min(1, "Envie uma imagem")
        .max(4_200_000, "Imagem muito grande")
        .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Imagem não está em base64 válido"),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>
