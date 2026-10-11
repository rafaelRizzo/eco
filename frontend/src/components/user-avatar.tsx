// Avatar do usuário: foto (baixada com o token) ou, sem foto, as iniciais do nome.
import type { User } from "@/components/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAvatarUrl } from "@/hooks/use-profile"
import { cn } from "@/lib/utils"

type Props = {
    user: Pick<User, "name" | "avatarUpdatedAt"> | null
    className?: string
    fallbackClassName?: string
}

const getInitials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("")

export function UserAvatar({ user, className, fallbackClassName }: Props) {
    const url = useAvatarUrl(user?.avatarUpdatedAt)

    return (
        <Avatar className={className}>
            {url ? <AvatarImage src={url} alt={user?.name ?? ""} /> : null}
            <AvatarFallback
                className={cn("bg-sidebar font-medium text-sidebar-accent-foreground text-xs", fallbackClassName)}
            >
                {getInitials(user?.name ?? "")}
            </AvatarFallback>
        </Avatar>
    )
}
