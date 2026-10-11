// "/" só redireciona: painel se há sessão, login se não.
import { createFileRoute, redirect } from "@tanstack/react-router"
import { getToken } from "@/lib/auth-storage"

export const Route = createFileRoute("/")({
    beforeLoad: () => {
        throw redirect({ to: getToken() ? "/dashboard" : "/login" })
    },
})
