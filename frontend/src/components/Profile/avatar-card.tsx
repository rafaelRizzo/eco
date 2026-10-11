// Card da foto de perfil: mostra a foto atual e deixa trocar ou remover.
import { CameraIcon, Trash2Icon } from "lucide-react"
import { useRef, useState } from "react"
import type { User } from "@/components/auth-provider"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import { AVATAR_ACCEPT } from "@/lib/image"

type Props = {
    user: User
    busy: boolean
    onUpload: (file: File) => Promise<boolean>
    onRemove: () => Promise<boolean>
}

export function AvatarCard({ user, busy, onUpload, onRemove }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [confirmingRemove, setConfirmingRemove] = useState(false)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Foto de perfil</CardTitle>
                <CardDescription>JPEG, PNG ou WebP. A imagem é recortada em formato quadrado.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
                <UserAvatar user={user} className="size-20" fallbackClassName="bg-muted text-2xl" />
                <div className="flex flex-wrap gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={AVATAR_ACCEPT}
                        className="sr-only"
                        tabIndex={-1}
                        aria-label="Escolher foto de perfil"
                        onChange={async (event) => {
                            const file = event.target.files?.[0]
                            // Limpa o input pra escolher o mesmo arquivo de novo depois de remover.
                            event.target.value = ""
                            if (file) await onUpload(file)
                        }}
                    />
                    <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
                        <CameraIcon />
                        {user.avatarUpdatedAt ? "Trocar foto" : "Enviar foto"}
                    </Button>
                    {user.avatarUpdatedAt ? (
                        <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmingRemove(true)}>
                            <Trash2Icon />
                            Remover
                        </Button>
                    ) : null}
                </div>
            </CardContent>
            <ConfirmDeleteDialog
                open={confirmingRemove}
                onOpenChange={setConfirmingRemove}
                title="Remover a foto de perfil?"
                description="A foto é apagada e volta a aparecer só as suas iniciais. Você pode enviar outra quando quiser."
                confirmLabel="Remover foto"
                busyLabel="Removendo..."
                onConfirm={onRemove}
            />
        </Card>
    )
}
