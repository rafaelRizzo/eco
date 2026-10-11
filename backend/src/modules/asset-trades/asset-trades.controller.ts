// Controller das operações de compra/venda: valida input, delega pro service, formata a resposta.
import type { FastifyReply, FastifyRequest } from "fastify"
import { handleError } from "../../lib/errors"
import { idParamSchema } from "../../schemas/responses"
import * as AssetTradesService from "./asset-trades.service"
import { createAssetTradeSchema, listAssetTradesQuerySchema } from "./schemas/asset-trade.schema"

export async function listTrades(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { assetId } = listAssetTradesQuerySchema.parse(req.query)
        const trades = await AssetTradesService.listTrades(req.user.id, assetId)
        return reply.send({ success: true, message: "Operações listadas", trades })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function createTrade(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = createAssetTradeSchema.parse(req.body)
        const trade = await AssetTradesService.createTrade(req.user.id, body)
        return reply.status(201).send({ success: true, message: "Operação registrada com sucesso", trade })
    } catch (error) {
        return handleError(reply, error, req)
    }
}

export async function deleteTrade(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = idParamSchema.parse(req.params)
        await AssetTradesService.deleteTrade(req.user.id, id)
        return reply.send({ success: true, message: "Operação excluída com sucesso" })
    } catch (error) {
        return handleError(reply, error, req)
    }
}
