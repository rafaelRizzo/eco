// Controller do perfil: valida input, delega pro service e formata a resposta (sempre sobre req.user.id).
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import * as ProfileService from "./profile.service"
import { updateProfileSchema, uploadAvatarSchema } from "./schemas/profile.schema"

export async function getProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
        const user = await ProfileService.getProfile(req.user.id)
        return reply.send({ success: true, message: "Perfil carregado", user })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = updateProfileSchema.parse(req.body)
        const result = await ProfileService.updateProfile(req.user.id, body)
        return reply.send({ success: true, message: "Perfil atualizado", ...result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function uploadAvatar(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = uploadAvatarSchema.parse(req.body)
        const avatarUpdatedAt = await ProfileService.setAvatar(req.user.id, body)
        return reply.send({ success: true, message: "Foto atualizada", avatarUpdatedAt })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function getAvatar(req: FastifyRequest, reply: FastifyReply) {
    try {
        const avatar = await ProfileService.getAvatar(req.user.id)
        // private + no-cache: é foto de pessoa, não pode ficar em cache compartilhado; o front revalida por avatarUpdatedAt.
        return reply
            .header("content-type", avatar.contentType)
            .header("cache-control", "private, no-cache")
            .header("x-content-type-options", "nosniff")
            .send(avatar.data)
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteAvatar(req: FastifyRequest, reply: FastifyReply) {
    try {
        await ProfileService.deleteAvatar(req.user.id)
        return reply.send({ success: true, message: "Foto removida" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
