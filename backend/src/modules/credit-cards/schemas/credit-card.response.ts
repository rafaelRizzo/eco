// Schemas de resposta de cartões (limite usado = soma das faturas ainda não pagas).
import { z } from "zod"

export const CreditCardSchema = z.object({
    id: z.string(),
    name: z.string(),
    limitCents: z.number().int(),
    usedLimitCents: z.number().int(),
    availableLimitCents: z.number().int(),
    closingDay: z.number().int(),
    dueDay: z.number().int(),
    paymentAccountId: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const CreateCreditCardResponse = z.object({ ...envelope, creditCard: CreditCardSchema })
export const GetCreditCardResponse = CreateCreditCardResponse
export const UpdateCreditCardResponse = CreateCreditCardResponse
export const ListCreditCardsResponse = z.object({ ...envelope, creditCards: z.array(CreditCardSchema) })
