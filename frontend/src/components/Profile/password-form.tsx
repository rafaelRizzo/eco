// Card de troca de senha: pede a atual, a nova e a confirmação; ao salvar as outras sessões abertas caem.
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type PasswordForm as PasswordFormValues, passwordFormSchema } from "@/hooks/use-profile"

type Props = {
    onSubmit: (form: PasswordFormValues) => Promise<boolean>
}

const empty: PasswordFormValues = { currentPassword: "", newPassword: "", confirmPassword: "" }

export function PasswordForm({ onSubmit }: Props) {
    const form = useForm<PasswordFormValues>({ resolver: zodResolver(passwordFormSchema), defaultValues: empty })
    const { errors, isSubmitting } = form.formState

    const submit = async (values: PasswordFormValues) => {
        if (await onSubmit(values)) form.reset(empty)
    }

    return (
        <Card>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                <CardHeader>
                    <CardTitle>Senha</CardTitle>
                    <CardDescription>
                        Ao trocar a senha, as outras sessões abertas com a senha antiga são encerradas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FieldGroup>
                        <Field data-invalid={!!errors.currentPassword}>
                            <FieldLabel htmlFor="password-current">Senha atual</FieldLabel>
                            <Input
                                id="password-current"
                                type="password"
                                autoComplete="current-password"
                                aria-invalid={!!errors.currentPassword}
                                {...form.register("currentPassword")}
                            />
                            <FieldError errors={[errors.currentPassword]} />
                        </Field>
                        <Field data-invalid={!!errors.newPassword}>
                            <FieldLabel htmlFor="password-new">Nova senha</FieldLabel>
                            <Input
                                id="password-new"
                                type="password"
                                autoComplete="new-password"
                                aria-invalid={!!errors.newPassword}
                                {...form.register("newPassword")}
                            />
                            <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
                            <FieldError errors={[errors.newPassword]} />
                        </Field>
                        <Field data-invalid={!!errors.confirmPassword}>
                            <FieldLabel htmlFor="password-confirm">Confirmar nova senha</FieldLabel>
                            <Input
                                id="password-confirm"
                                type="password"
                                autoComplete="new-password"
                                aria-invalid={!!errors.confirmPassword}
                                {...form.register("confirmPassword")}
                            />
                            <FieldError errors={[errors.confirmPassword]} />
                        </Field>
                    </FieldGroup>
                </CardContent>
                <CardFooter className="justify-end border-t">
                    <Button type="submit" disabled={isSubmitting}>
                        Alterar senha
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
