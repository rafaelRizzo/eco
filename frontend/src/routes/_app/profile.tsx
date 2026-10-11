// Página do perfil do próprio usuário: foto, nome/e-mail e troca de senha.
import { createFileRoute } from "@tanstack/react-router"
import { useAuth } from "@/components/auth-provider"
import { PageHeader } from "@/components/page-header"
import { AvatarCard } from "@/components/Profile/avatar-card"
import { PasswordForm } from "@/components/Profile/password-form"
import { ProfileForm } from "@/components/Profile/profile-form"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/hooks/use-profile"

export const Route = createFileRoute("/_app/profile")({
    staticData: { crumb: "Meu perfil" },
    component: ProfilePage,
})

function ProfilePage() {
    const { user, loading } = useAuth()
    const { updateProfile, changePassword, uploadAvatar, removeAvatar, uploadingAvatar } = useProfile()

    return (
        <>
            <PageHeader title="Meu perfil" description="Foto, dados da conta e senha." />

            {loading || !user ? (
                <Skeleton className="h-64 rounded-2xl" />
            ) : (
                // Duas colunas no desktop pra ocupar a largura do container como as outras páginas; empilha no celular.
                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <div className="grid gap-6">
                        <AvatarCard user={user} busy={uploadingAvatar} onUpload={uploadAvatar} onRemove={removeAvatar} />
                        <ProfileForm user={user} onSubmit={updateProfile} />
                    </div>
                    <PasswordForm onSubmit={changePassword} />
                </div>
            )}
        </>
    )
}
