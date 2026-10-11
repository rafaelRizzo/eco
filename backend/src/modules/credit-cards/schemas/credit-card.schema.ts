// Schemas de entrada de cartões de crédito.
import { z } from "zod"

const day = () => z.number().int().min(1, "Dia entre 1 e 31").max(31, "Dia entre 1 e 31")

export const createCreditCardSchema = z.object({
    name: z.string().trim().min(1, "Informe o nome").max(80),
    limitCents: z.number().int().min(0).default(0),
    closingDay: day(),
    dueDay: day(),
    paymentAccountId: z.string().min(1).nullable().optional(),
})

// Mudar fechamento/vencimento só afeta faturas criadas depois (as existentes mantêm as datas).
export const updateCreditCardSchema = createCreditCardSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo")

export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>
export type UpdateCreditCardInput = z.infer<typeof updateCreditCardSchema>
