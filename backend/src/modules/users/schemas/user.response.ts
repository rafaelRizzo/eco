// Schemas de resposta de usuário público (nunca passwordHash), compartilhados com auth e setup.
import { z } from "zod"
import { userRoleValues, userStatusValues } from "../../../db/schema"

export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(userRoleValues),
    status: z.enum(userStatusValues),
    avatarUpdatedAt: z.date().nullable(),
    createdAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const CreateUserResponse = z.object({ ...envelope, user: UserSchema })
export const UpdateUserResponse = CreateUserResponse
export const ListUsersResponse = z.object({ ...envelope, users: z.array(UserSchema) })
