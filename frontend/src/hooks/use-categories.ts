// Categorias de receita/despesa: tipos, schema do formulário e CRUD.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { z } from "zod"
import { api } from "@/lib/api"
import { invalidateMoney, withToast } from "@/lib/mutation"

export type TransactionType = "income" | "expense"

export const transactionTypeLabels: Record<TransactionType, string> = { income: "Receita", expense: "Despesa" }

export type Category = {
    id: string
    name: string
    type: TransactionType
    color: string | null
    createdAt: string
    updatedAt: string
}

export const categoryFormSchema = z.object({
    name: z.string().trim().min(1, "Dê um nome à categoria").max(60),
    type: z.enum(["income", "expense"]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Escolha uma cor"),
})

export type CategoryForm = z.infer<typeof categoryFormSchema>

export const CATEGORY_COLORS = [
    "#047857", // emerald-700
    "#10b981", // emerald-500
    "#6ee7b7", // emerald-300
    "#065f46", // emerald-800
    "#34d399", // emerald-400
    "#064e3b", // emerald-900
    "#262626", // neutral-800
    "#525252", // neutral-600
    "#a3a3a3", // neutral-400
    "#d4d4d4", // neutral-300
]

// Amostras claras pedem check escuro (branco some em cima delas).
export const LIGHT_CATEGORY_COLORS = new Set(["#6ee7b7", "#34d399", "#a3a3a3", "#d4d4d4"])

const fetchCategories = async () => (await api.get<{ categories: Category[] }>("/categories")).data.categories

export function useCategories() {
    const queryClient = useQueryClient()
    const { data: categories = [], isLoading: loading } = useQuery({
        queryKey: ["categories"],
        queryFn: fetchCategories,
    })

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] })

    const createMutation = useMutation({
        mutationFn: async (form: CategoryForm) => (await api.post<{ category: Category }>("/categories", form)).data.category,
        onSuccess: invalidate,
    })
    const updateMutation = useMutation({
        mutationFn: async ({ id, form }: { id: string; form: Omit<CategoryForm, "type"> }) =>
            (await api.patch<{ category: Category }>(`/categories/${id}`, form)).data.category,
        onSuccess: () => Promise.all([invalidate(), invalidateMoney(queryClient)]),
    })
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/categories/${id}`),
        onSuccess: () => Promise.all([invalidate(), invalidateMoney(queryClient)]),
    })

    const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])

    const createCategory = (form: CategoryForm) =>
        withToast(() => createMutation.mutateAsync(form), {
            loading: "Criando categoria...",
            success: "Categoria criada",
            error: "Não foi possível criar a categoria",
        })

    const updateCategory = async (id: string, form: Omit<CategoryForm, "type">) =>
        !!(await withToast(() => updateMutation.mutateAsync({ id, form }), {
            loading: "Salvando categoria...",
            success: "Categoria atualizada",
            error: "Não foi possível salvar a categoria",
        }))

    const deleteCategory = async (id: string) =>
        !!(await withToast(() => deleteMutation.mutateAsync(id), {
            loading: "Excluindo categoria...",
            success: "Categoria excluída",
            error: "Não foi possível excluir a categoria",
        }))

    return { categories, byId, loading, createCategory, updateCategory, deleteCategory }
}
