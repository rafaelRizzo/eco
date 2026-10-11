// Schemas de resposta de proventos: itens do mês (lançados ou estimados) e totais por situação.
import { z } from "zod"
import { dividendKindValues } from "../../../db/schema"

export const DividendItemSchema = z.object({
    // Estimativas não existem no banco: id sintético `estimated:<ativo>:<mês>`.
    id: z.string(),
    assetId: z.string(),
    ticker: z.string(),
    assetName: z.string(),
    kind: z.enum(dividendKindValues),
    quantity: z.number(),
    // Valor por cota em reais (6 casas); derivado de total/quantidade em registros antigos e estimativas.
    amountPerUnit: z.number(),
    totalCents: z.number().int(),
    comDate: z.string().nullable(),
    payDate: z.string(),
    // Receita criada na conta ao confirmar o recebimento; nulo = não creditado (ou estimativa).
    transactionId: z.string().nullable(),
    status: z.enum(["received", "pending", "estimated"]),
})

const TotalsSchema = z.object({
    totalCents: z.number().int(),
    receivedCents: z.number().int(),
    pendingCents: z.number().int(),
    estimatedCents: z.number().int(),
    // Estimados com data já vencida, aguardando confirmação de recebimento.
    dueCents: z.number().int(),
    dueCount: z.number().int(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const DividendResponse = z.object({ ...envelope, dividend: DividendItemSchema })
export const ListDividendsResponse = z.object({
    ...envelope,
    month: z.string(),
    dividends: z.array(DividendItemSchema),
    totals: TotalsSchema,
})
export const UpcomingDividendsResponse = z.object({
    ...envelope,
    months: z.array(TotalsSchema.extend({ month: z.string() })),
})
