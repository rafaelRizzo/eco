// Schemas de resposta do perfil: usuário público (nunca passwordHash) e metadados da foto.
import { z } from "zod"
import { UserSchema } from "../../users/schemas/user.response"

const envelope = { success: z.literal(true), message: z.string() }

export const ProfileResponse = z.object({ ...envelope, user: UserSchema })

// token só vem quando a senha mudou: o anterior deixa de valer e o front precisa trocar pelo novo.
export const UpdateProfileResponse = z.object({ ...envelope, user: UserSchema, token: z.string().optional() })

export const AvatarResponse = z.object({ ...envelope, avatarUpdatedAt: z.date() })
