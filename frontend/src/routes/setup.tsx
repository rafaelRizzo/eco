// Configuração inicial (bootstrap): cria o primeiro super admin com o SETUP_TOKEN do servidor. Só existe uma vez.
import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { KeyRoundIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { type SetupForm, setupSchema, useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loadSetupStatus } from "@/hooks/use-setup"
import { apiError } from "@/lib/api"
import { getToken } from "@/lib/auth-storage"

export const Route = createFileRoute("/setup")({
    beforeLoad: async ({ context }) => {
        const status = await loadSetupStatus(context.queryClient)
        if (status.completed) throw redirect({ to: getToken() ? "/dashboard" : "/login", search: {} })
    },
    component: SetupPage,
})

function SetupPage() {
    const { completeSetup } = useAuth()
    const navigate = useNavigate()
    const form = useForm<SetupForm>({
        resolver: zodResolver(setupSchema),
        defaultValues: { setupToken: "", name: "", email: "", password: "" },
    })
    const { errors, isSubmitting } = form.formState

    const onSubmit = async (values: SetupForm) => {
        try {
            await completeSetup(values)
            toast.success("Tudo pronto. Você é o super admin do Eco.")
            await navigate({ to: "/dashboard" })
        } catch (err) {
            toast.error(apiError(err, "Não foi possível concluir a configuração"))
        }
    }

    return (
        <AuthLayout
            title="Configuração inicial"
            subtitle="Primeiro acesso: crie a conta de super admin, que gerencia os usuários do Eco."
        >
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FieldGroup>
                    <Field data-invalid={!!errors.setupToken}>
                        <FieldLabel htmlFor="setup-token">
                            <KeyRoundIcon className="size-4" />
                            Token de configuração
                        </FieldLabel>
                        <Input
                            id="setup-token"
                            type="password"
                            autoComplete="off"
                            autoFocus
                            className="money"
                            aria-invalid={!!errors.setupToken}
                            {...form.register("setupToken")}
                        />
                        <FieldDescription>
                            É o valor de <code className="money">SETUP_TOKEN</code> no <code className="money">.env</code>{" "}
                            do servidor.
                        </FieldDescription>
                        <FieldError errors={[errors.setupToken]} />
                    </Field>

                    <FieldSeparator>Sua conta</FieldSeparator>

                    <Field data-invalid={!!errors.name}>
                        <FieldLabel htmlFor="setup-name">Nome</FieldLabel>
                        <Input id="setup-name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
                        <FieldError errors={[errors.name]} />
                    </Field>
                    <Field data-invalid={!!errors.email}>
                        <FieldLabel htmlFor="setup-email">E-mail</FieldLabel>
                        <Input
                            id="setup-email"
                            type="email"
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                            {...form.register("email")}
                        />
                        <FieldError errors={[errors.email]} />
                    </Field>
                    <Field data-invalid={!!errors.password}>
                        <FieldLabel htmlFor="setup-password">Senha</FieldLabel>
                        <Input
                            id="setup-password"
                            type="password"
                            autoComplete="new-password"
                            aria-invalid={!!errors.password}
                            {...form.register("password")}
                        />
                        <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
                        <FieldError errors={[errors.password]} />
                    </Field>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Configurando..." : "Criar super admin e entrar"}
                    </Button>
                </FieldGroup>
            </form>
        </AuthLayout>
    )
}
