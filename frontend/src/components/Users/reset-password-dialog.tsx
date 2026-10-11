// Dialog do super admin pra definir uma senha nova pra um usuário (ex: esqueceu a senha).
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import type { User } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type ResetPasswordForm, resetPasswordSchema } from "@/hooks/use-users"

type Props = {
    user: User | null
    onOpenChange: (open: boolean) => void
    onSubmit: (user: User, password: string) => Promise<boolean>
}

export function ResetPasswordDialog({ user, onOpenChange, onSubmit }: Props) {
    const form = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "" } })
    const { errors, isSubmitting } = form.formState

    useEffect(() => {
        if (user) form.reset({ password: "" })
    }, [user, form])

    const submit = async ({ password }: ResetPasswordForm) => {
        if (user && (await onSubmit(user, password))) onOpenChange(false)
    }

    return (
        <Dialog open={!!user} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Redefinir senha</DialogTitle>
                    <DialogDescription>
                        Nova senha de {user?.name}. A sessão atual dele continua até expirar.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} noValidate className="contents">
                    <DialogBody>
                        <Field data-invalid={!!errors.password}>
                            <FieldLabel htmlFor="reset-password">Nova senha</FieldLabel>
                            <Input
                                id="reset-password"
                                type="password"
                                autoComplete="new-password"
                                autoFocus
                                aria-invalid={!!errors.password}
                                {...form.register("password")}
                            />
                            <FieldError errors={[errors.password]} />
                        </Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            Salvar senha
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
