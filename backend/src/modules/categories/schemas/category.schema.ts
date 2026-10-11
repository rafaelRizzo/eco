// Schemas de entrada de categorias.
import { z } from "zod"
import { transactionTypeValues } from "../../../db/schema"

export const createCategorySchema = z.object({
    name: z.string().trim().min(1, "Informe o nome").max(60),
    type: z.enum(transactionTypeValues),
    color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, "Cor precisa estar no formato #RRGGBB")
        .nullable()
        .optional(),
})

// Tipo não muda depois de criada: lançamentos já vinculados dependem dele.
export const updateCategorySchema = createCategorySchema
    .omit({ type: true })
    .partial()
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo")

export const categoryQuerySchema = z.object({
    type: z.enum(transactionTypeValues).optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CategoryQuery = z.infer<typeof categoryQuerySchema>
