// Schemas de resposta de categorias.
import { z } from "zod"
import { transactionTypeValues } from "../../../db/schema"

export const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(transactionTypeValues),
    color: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const CreateCategoryResponse = z.object({ ...envelope, category: CategorySchema })
export const UpdateCategoryResponse = CreateCategoryResponse
export const ListCategoriesResponse = z.object({ ...envelope, categories: z.array(CategorySchema) })
