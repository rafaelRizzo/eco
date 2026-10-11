// Dialog de criar/editar categoria: nome, tipo (só na criação) e cor.
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CATEGORY_COLORS, type Category, type CategoryForm, categoryFormSchema, LIGHT_CATEGORY_COLORS } from "@/hooks/use-categories"
import { cn } from "@/lib/utils"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    category: Category | null
    defaultType: "income" | "expense"
    onSubmit: (form: CategoryForm) => Promise<boolean>
}

export function CategoryFormDialog({ open, onOpenChange, category, defaultType, onSubmit }: Props) {
    const form = useForm<CategoryForm>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: { name: "", type: defaultType, color: CATEGORY_COLORS[0] },
    })
    const { errors, isSubmitting } = form.formState

    useEffect(() => {
        if (open) {
            form.reset(
                category
                    ? { name: category.name, type: category.type, color: category.color ?? CATEGORY_COLORS[0] }
                    : { name: "", type: defaultType, color: CATEGORY_COLORS[0] },
            )
        }
    }, [open, category, defaultType, form])

    const submit = async (values: CategoryForm) => {
        if (await onSubmit(values)) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
                    <DialogDescription>Categorias agrupam seus gastos e receitas no resumo do mês.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                    <DialogBody>
                        <FieldGroup>
                            {category ? null : (
                                <Controller
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <Tabs value={field.value} onValueChange={field.onChange}>
                                            <TabsList className="w-full">
                                                <TabsTrigger value="expense">Despesa</TabsTrigger>
                                                <TabsTrigger value="income">Receita</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    )}
                                />
                            )}
                            <Field data-invalid={!!errors.name}>
                                <FieldLabel htmlFor="category-name">Nome</FieldLabel>
                                <Input
                                    id="category-name"
                                    placeholder="Ex: Pets"
                                    autoFocus
                                    aria-invalid={!!errors.name}
                                    {...form.register("name")}
                                />
                                <FieldError errors={[errors.name]} />
                            </Field>
                            <Field>
                                <FieldLabel>Cor</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="color"
                                    render={({ field }) => (
                                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor">
                                            {CATEGORY_COLORS.map((color) => {
                                                const selected = field.value === color
                                                return (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={selected}
                                                        aria-label={color}
                                                        onClick={() => field.onChange(color)}
                                                        className={cn(
                                                            "grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                            selected && "ring-2 ring-foreground",
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {selected ? (
                                                            <CheckIcon
                                                                className={cn(
                                                                    "size-4",
                                                                    LIGHT_CATEGORY_COLORS.has(color) ? "text-neutral-950" : "text-neutral-50",
                                                                )}
                                                            />
                                                        ) : null}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                />
                            </Field>
                        </FieldGroup>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {category ? "Salvar categoria" : "Criar categoria"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
