// Lista de categorias de um tipo, com cor e ações de editar/excluir.
import { PencilIcon, Trash2Icon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import type { Category } from "@/hooks/use-categories"

type Props = {
    categories: Category[]
    onEdit: (category: Category) => void
    onDelete: (category: Category) => void
}

export function CategoriesList({ categories, onEdit, onDelete }: Props) {
    return (
        <ul className="divide-y rounded-2xl border bg-card">
            <AnimatePresence initial={false}>
                {categories.map((category) => (
                    <motion.li
                        key={category.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="group flex items-center gap-3 overflow-hidden px-4 py-3"
                    >
                        <span
                            className="swatch size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: category.color ?? "var(--muted-foreground)" }}
                        />
                        <span className="flex-1 font-medium text-sm">{category.name}</span>
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${category.name}`} onClick={() => onEdit(category)}>
                            <PencilIcon />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Excluir ${category.name}`}
                            onClick={() => onDelete(category)}
                            className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
                        >
                            <Trash2Icon />
                        </Button>
                    </motion.li>
                ))}
            </AnimatePresence>
        </ul>
    )
}
