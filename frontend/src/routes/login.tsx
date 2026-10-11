// Tela de login: e-mail + senha; sessão expirada chega aqui com ?expired=1.
import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { AuthLayout } from "@/components/auth-layout"
import { type LoginForm, loginSchema, useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loadSetupStatus, useSetupStatus } from "@/hooks/use-setup"
import { apiError } from "@/lib/api"
import { getToken } from "@/lib/auth-storage"

export const Route = createFileRoute("/login")({
    validateSearch: z.object({ expired: z.coerce.number().optional() }),
    beforeLoad: async ({ context }) => {
        if (getToken()) throw redirect({ to: "/dashboard" })
        // Sistema sem super admin ainda: o primeiro acesso é a configuração inicial.
        const status = await loadSetupStatus(context.queryClient)
        if (!status.completed) throw redirect({ to: "/setup" })
    },
    component: LoginPage,
})

function LoginPage() {
    const { expired } = Route.useSearch()
    const { login } = useAuth()
    const { signupEnabled } = useSetupStatus()
    const navigate = useNavigate()
    const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })
    const { errors, isSubmitting } = form.formState

    const onSubmit = async (values: LoginForm) => {
        try {
            await login(values)
            await navigate({ to: "/dashboard" })
        } catch (err) {
            toast.error(apiError(err, "Não foi possível entrar"))
        }
    }

    return (
        <AuthLayout
            title="Entrar"
            subtitle={expired ? "Sua sessão expirou. Entre de novo pra continuar." : "Bom te ver de novo."}
        >
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FieldGroup>
                    <Field data-invalid={!!errors.email}>
                        <FieldLabel htmlFor="email">E-mail</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            autoFocus
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
                            autoComplete="current-password"
                            aria-invalid={!!errors.password}
                            {...form.register("password")}
                        />
                        <FieldError errors={[errors.password]} />
                    </Field>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Entrando..." : "Entrar"}
                    </Button>
                </FieldGroup>
            </form>
            {signupEnabled ? (
                <p className="text-center text-muted-foreground text-sm">
                    Ainda não tem conta?{" "}
                    <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                        Criar conta
                    </Link>
                </p>
            ) : (
                <p className="text-center text-muted-foreground text-sm">Sem conta? Peça acesso ao administrador.</p>
            )}
        </AuthLayout>
    )
}
