// Tela de cadastro: cria a conta já com categorias padrão (feito pelo backend) e entra direto no painel.
import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { type RegisterForm, registerSchema, useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loadSetupStatus } from "@/hooks/use-setup"
import { apiError } from "@/lib/api"
import { getToken } from "@/lib/auth-storage"

export const Route = createFileRoute("/register")({
    beforeLoad: async ({ context }) => {
        if (getToken()) throw redirect({ to: "/dashboard" })
        const status = await loadSetupStatus(context.queryClient)
        if (!status.completed) throw redirect({ to: "/setup" })
        // Cadastro público desligado (ALLOW_PUBLIC_SIGNUP=false): conta só via super admin.
        if (!status.signupEnabled) throw redirect({ to: "/login", search: {} })
    },
    component: RegisterPage,
})

function RegisterPage() {
    const { register } = useAuth()
    const navigate = useNavigate()
    const form = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: { name: "", email: "", password: "" },
    })
    const { errors, isSubmitting } = form.formState

    const onSubmit = async (values: RegisterForm) => {
        try {
            await register(values)
            toast.success("Conta criada. Comece cadastrando uma conta bancária.")
            await navigate({ to: "/accounts" })
        } catch (err) {
            toast.error(apiError(err, "Não foi possível criar a conta"))
        }
    }

    return (
        <AuthLayout title="Criar conta" subtitle="Leva menos de um minuto.">
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FieldGroup>
                    <Field data-invalid={!!errors.name}>
                        <FieldLabel htmlFor="name">Nome</FieldLabel>
                        <Input id="name" autoComplete="name" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
                        <FieldError errors={[errors.name]} />
                    </Field>
                    <Field data-invalid={!!errors.email}>
                        <FieldLabel htmlFor="email">E-mail</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                            {...form.register("email")}
                        />
                        <FieldError errors={[errors.email]} />
                    </Field>
                    <Field data-invalid={!!errors.password}>
                        <FieldLabel htmlFor="password">Senha</FieldLabel>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            aria-invalid={!!errors.password}
                            {...form.register("password")}
                        />
                        <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
                        <FieldError errors={[errors.password]} />
                    </Field>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Criando..." : "Criar conta"}
                    </Button>
                </FieldGroup>
            </form>
            <p className="text-center text-muted-foreground text-sm">
                Já tem conta?{" "}
                <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                    Entrar
                </Link>
            </p>
        </AuthLayout>
    )
}
