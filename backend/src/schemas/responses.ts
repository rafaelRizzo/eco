// Schemas Zod compartilhados de resposta: envelope de erro por status code e helpers comuns.
import { z } from "zod"

const errorSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
})

export const errors = {
    400: errorSchema.describe("Dados inválidos ou regra de negócio violada"),
    401: errorSchema.describe("Não autenticado"),
    403: errorSchema.describe("Sem permissão"),
    404: errorSchema.describe("Recurso não encontrado"),
    409: errorSchema.describe("Conflito"),
    429: errorSchema.describe("Muitas requisições"),
} as const

export const successMessageResponse = z.object({ success: z.literal(true), message: z.string() })

export const idParamSchema = z.object({ id: z.string().min(1) })

// Mesmo formato da coluna `date` do Postgres.
export const dateString = () => z.iso.date()

export const monthString = () => z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use o formato YYYY-MM")

// Colunas *_cents são int32 no Postgres: acima disso o insert estoura (22003) e vira 500.
export const MAX_CENTS = 2_147_483_647

export const cents = () => z.number().int().max(MAX_CENTS, "Valor muito grande")

export const positiveCents = () =>
    z.number().int().positive("Valor precisa ser maior que zero").max(MAX_CENTS, "Valor muito grande")

// Valor por cota em reais com até 6 casas (pode ser menor que R$ 0,01 em ações).
export const perUnitAmount = () =>
    z
        .number()
        .positive("Valor por cota precisa ser maior que zero")
        .max(1_000_000, "Valor por cota muito grande")
        .refine((value) => Math.abs(Math.round(value * 1e6) / 1e6 - value) < 1e-9, "Use no máximo 6 casas decimais")

export const bearerSecurity = [{ bearerAuth: [] }]
