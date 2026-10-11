// Dialog do super admin pra criar usuário: nome, e-mail, senha inicial e papel.
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type UserForm, userFormSchema, userRoleLabels } from "@/hooks/use-users"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (form: UserForm) => Promise<boolean>
}

const roleOptions = Object.entries(userRoleLabels).map(([value, label]) => ({ value, label }))
const emptyForm: UserForm = { name: "", email: "", password: "", role: "user" }

export function UserFormDialog({ open, onOpenChange, onSubmit }: Props) {
    const form = useForm<UserForm>({ resolver: zodResolver(userFormSchema), defaultValues: emptyForm })
    const { errors, isSubmitting } = form.formState

    useEffect(() => {
        if (open) form.reset(emptyForm)
    }, [open, form])

    const submit = async (values: UserForm) => {
        if (await onSubmit(values)) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Novo usuário</DialogTitle>
                    <DialogDescription>A conta já nasce com as categorias padrão. Passe a senha pra pessoa.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                    <DialogBody>
                        <FieldGroup>
                            <Field data-invalid={!!errors.name}>
                                <FieldLabel htmlFor="user-name">Nome</FieldLabel>
                                <Input id="user-name" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
                                <FieldError errors={[errors.name]} />
                            </Field>
                            <Field data-invalid={!!errors.email}>
                                <FieldLabel htmlFor="user-email">E-mail</FieldLabel>
                                <Input id="user-email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
                                <FieldError errors={[errors.email]} />
                            </Field>
                            <Field data-invalid={!!errors.password}>
                                <FieldLabel htmlFor="user-password">Senha inicial</FieldLabel>
                                <Input
                                    id="user-password"
                                    type="password"
                                    autoComplete="new-password"
                                    aria-invalid={!!errors.password}
                                    {...form.register("password")}
                                />
                                <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
                                <FieldError errors={[errors.password]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="user-role">Papel</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <OptionSelect
                                            id="user-role"
                                            options={roleOptions}
                                            value={field.value}
                                            onChange={(value) => value && field.onChange(value)}
                                        />
                                    )}
                                />
                                <FieldDescription>Super admin também gerencia usuários.</FieldDescription>
                            </Field>
                        </FieldGroup>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            Criar usuário
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
