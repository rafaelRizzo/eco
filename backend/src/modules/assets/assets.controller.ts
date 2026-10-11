// Controller de ativos: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as AssetsService from "./assets.service"
import { createAssetSchema, deleteAssetQuerySchema, updateAssetSchema } from "./schemas/asset.schema"

export async function listAssets(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await AssetsService.listAssets(req.user.id)
        return reply.send({ success: true, message: "Ativos listados", ...result })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createAsset(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createAssetSchema.parse(req.body)
        const asset = await AssetsService.createAsset(req.user.id, body)
        return reply.status(201).send({ success: true, message: "Ativo criado com sucesso", asset })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function updateAsset(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const body = updateAssetSchema.parse(req.body)
        const asset = await AssetsService.updateAsset(req.user.id, id, body)
        return reply.send({ success: true, message: "Ativo atualizado com sucesso", asset })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteAsset(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        const { cascade } = deleteAssetQuerySchema.parse(req.query)
        await AssetsService.deleteAsset(req.user.id, id, cascade)
        return reply.send({ success: true, message: "Ativo excluído com sucesso" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
