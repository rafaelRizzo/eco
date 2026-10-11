// Página de usuários (só super admin): lista, cria, bloqueia/desbloqueia, troca papel e redefine senha.
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { type User, useAuth } from "@/components/auth-provider"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ResetPasswordDialog } from "@/components/Users/reset-password-dialog"
import { UserFormDialog } from "@/components/Users/user-form-dialog"
import { UsersList } from "@/components/Users/users-list"
import { useUsers } from "@/hooks/use-users"

export const Route = createFileRoute("/_app/users")({
    staticData: { crumb: "Usuários" },
    component: UsersPage,
})

function UsersPage() {
    const { user: me, isSuperAdmin, loading: meLoading } = useAuth()
    const { users, loading, createUser, setStatus, setRole, resetPassword } = useUsers(isSuperAdmin)
    const [formOpen, setFormOpen] = useState(false)
    const [blocking, setBlocking] = useState<User | null>(null)
    const [resetting, setResetting] = useState<User | null>(null)

    // A API já devolve 403 pra quem não é super admin; aqui só evita mostrar a tela vazia.
    if (!meLoading && !isSuperAdmin) return <Navigate to="/dashboard" search={{}} />

    const activeCount = users.filter((user) => user.status === "active").length

    return (
        <>
            <PageHeader
                title="Usuários"
                description={users.length ? `${users.length} contas · ${activeCount} ativas` : "Quem tem acesso ao Eco"}
                actions={
                    <Button onClick={() => setFormOpen(true)}>
                        <PlusIcon />
                        Novo usuário
                    </Button>
                }
            />

            {loading || meLoading ? (
                <Skeleton className="h-64 rounded-2xl" />
            ) : (
                <UsersList
                    users={users}
                    currentUserId={me?.id ?? ""}
                    onToggleStatus={(user) => (user.status === "blocked" ? setStatus(user, "active") : setBlocking(user))}
                    onToggleRole={(user) => setRole(user, user.role === "super_admin" ? "user" : "super_admin")}
                    onResetPassword={setResetting}
                />
            )}

            <UserFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={async (form) => !!(await createUser(form))} />

            <ResetPasswordDialog
                user={resetting}
                onOpenChange={(open) => !open && setResetting(null)}
                onSubmit={resetPassword}
            />

            <ConfirmDeleteDialog
                open={!!blocking}
                onOpenChange={(open) => !open && setBlocking(null)}
                title={`Bloquear ${blocking?.name ?? "usuário"}?`}
                description="O acesso cai na hora, inclusive em sessões abertas. Os dados dele continuam guardados e você pode desbloquear depois."
                confirmLabel="Bloquear acesso"
                busyLabel="Bloqueando..."
                onConfirm={() => (blocking ? setStatus(blocking, "blocked") : Promise.resolve(false))}
            />
        </>
    )
}
