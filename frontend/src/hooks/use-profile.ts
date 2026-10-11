// Perfil do próprio usuário: editar dados, trocar senha e foto. A foto é baixada como blob (o endpoint exige Bearer).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"
import type { User } from "@/components/auth-provider"
import { api } from "@/lib/api"
import { setToken } from "@/lib/auth-storage"
import { fileToAvatarBase64 } from "@/lib/image"
import { withToast } from "@/lib/mutation"

const name = () => z.string().trim().min(2, "O nome precisa ter ao menos 2 letras")
const email = () => z.string().trim().pipe(z.email("Informe um e-mail válido"))

// Trocar o e-mail exige a senha atual: a regra depende do e-mail que a pessoa tem hoje, por isso é uma fábrica.
export const profileFormSchema = (currentEmail: string) =>
    z
        .object({ name: name(), email: email(), currentPassword: z.string() })
        .refine((data) => data.email.toLowerCase() === currentEmail.toLowerCase() || data.currentPassword.length > 0, {
            path: ["currentPassword"],
            message: "Informe a senha atual para trocar o e-mail",
        })

export type ProfileForm = { name: string; email: string; currentPassword: string }

export const passwordFormSchema = z
    .object({
        currentPassword: z.string().min(1, "Informe a senha atual"),
        newPassword: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "As senhas não conferem",
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
        path: ["newPassword"],
        message: "A nova senha precisa ser diferente da atual",
    })

export type PasswordForm = z.infer<typeof passwordFormSchema>

type ProfileChanges = Partial<{ name: string; email: string; currentPassword: string; newPassword: string }>
type UpdateResponse = { user: User; token?: string }

const avatarQueryKey = (avatarUpdatedAt: string) => ["avatar", avatarUpdatedAt] as const

// URL local (blob) da foto; a chave inclui avatarUpdatedAt, então trocar a foto baixa de novo e o resto vem do cache.
export function useAvatarUrl(avatarUpdatedAt: string | null | undefined) {
    const { data } = useQuery({
        queryKey: avatarQueryKey(avatarUpdatedAt ?? ""),
        queryFn: async () =>
            URL.createObjectURL((await api.get<Blob>("/profile/avatar", { responseType: "blob" })).data),
        enabled: !!avatarUpdatedAt,
        staleTime: Number.POSITIVE_INFINITY,
    })
    return avatarUpdatedAt ? data : undefined
}

export function useProfile() {
    const queryClient = useQueryClient()
    const patchMe = (changes: Partial<User>) =>
        queryClient.setQueryData<User>(["me"], (current) => (current ? { ...current, ...changes } : current))

    const updateMutation = useMutation({
        mutationFn: async (changes: ProfileChanges) => (await api.patch<UpdateResponse>("/profile", changes)).data,
        onSuccess: ({ user, token }) => {
            // Troca de senha invalida o token antigo: guarda o novo antes da próxima request.
            if (token) setToken(token)
            queryClient.setQueryData(["me"], user)
        },
    })

    const uploadMutation = useMutation({
        mutationFn: async (image: string) =>
            (await api.post<{ avatarUpdatedAt: string }>("/profile/avatar", { image })).data.avatarUpdatedAt,
        onSuccess: (avatarUpdatedAt) => patchMe({ avatarUpdatedAt }),
    })

    const removeMutation = useMutation({
        mutationFn: async () => api.delete("/profile/avatar"),
        onSuccess: () => patchMe({ avatarUpdatedAt: null }),
    })

    const update = async (changes: ProfileChanges, messages: { loading: string; success: string }) =>
        !!(await withToast(() => updateMutation.mutateAsync(changes), {
            ...messages,
            error: "Não foi possível atualizar o perfil",
        }))

    const updateProfile = (changes: { name?: string; email?: string; currentPassword?: string }) =>
        update(changes, { loading: "Salvando perfil...", success: "Perfil atualizado" })

    const changePassword = (form: PasswordForm) =>
        update(
            { currentPassword: form.currentPassword, newPassword: form.newPassword },
            { loading: "Alterando senha...", success: "Senha alterada" },
        )

    const uploadAvatar = async (file: File) => {
        let image: string
        try {
            image = await fileToAvatarBase64(file)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível preparar a imagem")
            return false
        }
        return !!(await withToast(() => uploadMutation.mutateAsync(image), {
            loading: "Enviando foto...",
            success: "Foto atualizada",
            error: "Não foi possível enviar a foto",
        }))
    }

    const removeAvatar = async () =>
        !!(await withToast(() => removeMutation.mutateAsync(), {
            loading: "Removendo foto...",
            success: "Foto removida",
            error: "Não foi possível remover a foto",
        }))

    return {
        updateProfile,
        changePassword,
        uploadAvatar,
        removeAvatar,
        uploadingAvatar: uploadMutation.isPending || removeMutation.isPending,
    }
}
