// Gestão de usuários (só super admin): listar, criar, bloquear/desbloquear, trocar papel e redefinir senha.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import type { User, UserRole, UserStatus } from "@/components/auth-provider"
import { api } from "@/lib/api"
import { withToast } from "@/lib/mutation"

export const userRoleLabels: Record<UserRole, string> = { super_admin: "Super admin", user: "Usuário" }
export const userStatusLabels: Record<UserStatus, string> = { active: "Ativo", blocked: "Bloqueado" }

export const userFormSchema = z.object({
    name: z.string().trim().min(2, "O nome precisa ter ao menos 2 letras"),
    email: z.string().trim().pipe(z.email("Informe um e-mail válido")),
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
    role: z.enum(["super_admin", "user"]),
})

export type UserForm = z.infer<typeof userFormSchema>

export const resetPasswordSchema = z.object({
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
})

export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

type UserChanges = Partial<{ name: string; role: UserRole; status: UserStatus; password: string }>

export function useUsers(enabled: boolean) {
    const queryClient = useQueryClient()
    const { data: users = [], isLoading: loading } = useQuery({
        queryKey: ["users"],
        queryFn: async () => (await api.get<{ users: User[] }>("/users")).data.users,
        enabled,
    })

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] })

    const createMutation = useMutation({
        mutationFn: async (form: UserForm) => (await api.post<{ user: User }>("/users", form)).data.user,
        onSuccess: invalidate,
    })
    const updateMutation = useMutation({
        mutationFn: async ({ id, changes }: { id: string; changes: UserChanges }) =>
            (await api.patch<{ user: User }>(`/users/${id}`, changes)).data.user,
        onSuccess: invalidate,
    })

    const createUser = (form: UserForm) =>
        withToast(() => createMutation.mutateAsync(form), {
            loading: "Criando usuário...",
            success: "Usuário criado",
            error: "Não foi possível criar o usuário",
        })

    const update = async (id: string, changes: UserChanges, messages: { loading: string; success: string }) =>
        !!(await withToast(() => updateMutation.mutateAsync({ id, changes }), {
            ...messages,
            error: "Não foi possível atualizar o usuário",
        }))

    const setStatus = (user: User, status: UserStatus) =>
        update(user.id, { status }, {
            loading: status === "blocked" ? "Bloqueando..." : "Desbloqueando...",
            success: status === "blocked" ? `${user.name} foi bloqueado` : `${user.name} foi desbloqueado`,
        })

    const setRole = (user: User, role: UserRole) =>
        update(user.id, { role }, {
            loading: "Alterando papel...",
            success: role === "super_admin" ? `${user.name} agora é super admin` : `${user.name} agora é usuário`,
        })

    const resetPassword = (user: User, password: string) =>
        update(user.id, { password }, { loading: "Redefinindo senha...", success: "Senha redefinida" })

    return { users, loading, createUser, setStatus, setRole, resetPassword }
}
