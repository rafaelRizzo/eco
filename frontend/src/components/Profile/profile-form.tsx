// Card com nome e e-mail do usuário; trocar o e-mail pede a senha atual (campo só aparece quando o e-mail muda).
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import type { User } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type ProfileForm as ProfileFormValues, profileFormSchema } from "@/hooks/use-profile"

type Props = {
    user: User
    onSubmit: (changes: { name?: string; email?: string; currentPassword?: string }) => Promise<boolean>
}

export function ProfileForm({ user, onSubmit }: Props) {
    const schema = useMemo(() => profileFormSchema(user.email), [user.email])
    const initial: ProfileFormValues = { name: user.name, email: user.email, currentPassword: "" }
    const form = useForm<ProfileFormValues>({ resolver: zodResolver(schema), defaultValues: initial })
    const { errors, isSubmitting, isDirty } = form.formState
    const emailChanged = form.watch("email").trim().toLowerCase() !== user.email.toLowerCase()

    // Depois de salvar (ou se o usuário mudar por outro lado) o formulário volta a refletir o que está no servidor.
    // biome-ignore lint/correctness/useExhaustiveDependencies: `initial` é derivado de user.name/user.email.
    useEffect(() => form.reset({ name: user.name, email: user.email, currentPassword: "" }), [user.name, user.email, form])

    const submit = async (values: ProfileFormValues) => {
        const changes: { name?: string; email?: string; currentPassword?: string } = {}
        if (values.name.trim() !== user.name) changes.name = values.name.trim()
        if (emailChanged) {
            changes.email = values.email.trim()
            changes.currentPassword = values.currentPassword
        }
        if (Object.keys(changes).length === 0) return
        await onSubmit(changes)
    }

    return (
        <Card>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                <CardHeader>
                    <CardTitle>Dados da conta</CardTitle>
                    <CardDescription>Seu nome e o e-mail que você usa pra entrar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FieldGroup>
                        <Field data-invalid={!!errors.name}>
                            <FieldLabel htmlFor="profile-name">Nome</FieldLabel>
                            <Input id="profile-name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
                            <FieldError errors={[errors.name]} />
                        </Field>
                        <Field data-invalid={!!errors.email}>
                            <FieldLabel htmlFor="profile-email">E-mail</FieldLabel>
                            <Input
                                id="profile-email"
                                type="email"
                                autoComplete="email"
                                aria-invalid={!!errors.email}
                                {...form.register("email")}
                            />
                            <FieldError errors={[errors.email]} />
                        </Field>
                        {emailChanged ? (
                            <Field data-invalid={!!errors.currentPassword}>
                                <FieldLabel htmlFor="profile-current-password">Senha atual</FieldLabel>
                                <Input
                                    id="profile-current-password"
                                    type="password"
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.currentPassword}
                                    {...form.register("currentPassword")}
                                />
                                <FieldDescription>Necessária pra confirmar a troca de e-mail.</FieldDescription>
                                <FieldError errors={[errors.currentPassword]} />
                            </Field>
                        ) : null}
                    </FieldGroup>
                </CardContent>
                <CardFooter className="justify-end border-t">
                    <Button type="submit" disabled={isSubmitting || !isDirty}>
                        Salvar alterações
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
