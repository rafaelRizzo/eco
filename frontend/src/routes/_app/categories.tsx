// Página de categorias: despesas e receitas lado a lado, criar/editar/excluir.
import { createFileRoute } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { CategoriesList } from "@/components/Categories/categories-list"
import { CategoryFormDialog } from "@/components/Categories/category-form-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { type Category, type TransactionType, useCategories } from "@/hooks/use-categories"

export const Route = createFileRoute("/_app/categories")({
    staticData: { crumb: "Categorias" },
    component: CategoriesPage,
})

const SECTIONS: { type: TransactionType; title: string }[] = [
    { type: "expense", title: "Despesas" },
    { type: "income", title: "Receitas" },
]

function CategoriesPage() {
    const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories()
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [defaultType, setDefaultType] = useState<TransactionType>("expense")
    const [deleting, setDeleting] = useState<Category | null>(null)

    const openCreate = (type: TransactionType) => {
        setEditing(null)
        setDefaultType(type)
        setFormOpen(true)
    }

    return (
        <>
            <PageHeader
                title="Categorias"
                description="Organizam o resumo do mês e o gasto por categoria"
                actions={
                    <Button onClick={() => openCreate("expense")}>
                        <PlusIcon />
                        Nova categoria
                    </Button>
                }
            />

            <div className="grid gap-8 md:grid-cols-2">
                {SECTIONS.map(({ type, title }) => (
                    <section key={type} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg">{title}</h2>
                            <Button variant="ghost" size="sm" onClick={() => openCreate(type)}>
                                <PlusIcon />
                                Adicionar
                            </Button>
                        </div>
                        {loading ? (
                            <Skeleton className="h-64 rounded-2xl" />
                        ) : (
                            <CategoriesList
                                categories={categories.filter((category) => category.type === type)}
                                onEdit={(category) => {
                                    setEditing(category)
                                    setFormOpen(true)
                                }}
                                onDelete={setDeleting}
                            />
                        )}
                    </section>
                ))}
            </div>

            <CategoryFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                category={editing}
                defaultType={defaultType}
                onSubmit={async (form) =>
                    editing
                        ? updateCategory(editing.id, { name: form.name, color: form.color })
                        : !!(await createCategory(form))
                }
            />

            <ConfirmDeleteDialog
                open={!!deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Excluir ${deleting?.name ?? "categoria"}?`}
                description="Os lançamentos dessa categoria continuam existindo, só ficam sem categoria."
                confirmLabel="Excluir categoria"
                onConfirm={() => (deleting ? deleteCategory(deleting.id) : Promise.resolve(false))}
            />
        </>
    )
}
