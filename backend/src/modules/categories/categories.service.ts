// Regras de categorias: CRUD escopado por usuário; excluir categoria deixa os lançamentos sem categoria.
import { and, eq } from "drizzle-orm"
import { categories } from "../../db/schema"
import { cached } from "../../lib/cache"
import { type DbOrTx, db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import type { CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from "./schemas/category.schema"

export const findOwnedCategory = async (userId: string, categoryId: string, executor: DbOrTx = db) => {
    const category = await executor.query.categories.findFirst({
        where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
    })
    if (!category) throw new AppError("Categoria não encontrada", 404)
    return category
}

// Categoria de despesa num lançamento de receita (ou vice-versa) bagunça o relatório por categoria.
export const assertCategoryMatchesType = async (
    userId: string,
    categoryId: string | null | undefined,
    type: "income" | "expense",
    executor: DbOrTx = db,
) => {
    if (!categoryId) return
    const category = await findOwnedCategory(userId, categoryId, executor)
    if (category.type !== type) throw new AppError("Categoria não é do mesmo tipo do lançamento", 400)
}

export const listCategories = (userId: string, query: CategoryQuery) =>
    cached(userId, "categories", query.type ?? "all", () =>
        db.query.categories.findMany({
            where: and(eq(categories.userId, userId), query.type ? eq(categories.type, query.type) : undefined),
            orderBy: (table, { asc }) => [asc(table.type), asc(table.name)],
        }),
    )

export const createCategory = async (userId: string, input: CreateCategoryInput) => {
    const [category] = await db
        .insert(categories)
        .values({ ...input, userId })
        .returning()
    return category!
}

export const updateCategory = async (userId: string, categoryId: string, input: UpdateCategoryInput) => {
    await findOwnedCategory(userId, categoryId)
    const [category] = await db
        .update(categories)
        .set(input)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
        .returning()
    return category!
}

export const deleteCategory = async (userId: string, categoryId: string) => {
    await findOwnedCategory(userId, categoryId)
    await db.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
}
