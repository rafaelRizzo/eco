// Lista de usuários pro super admin: papel, status e ações (bloquear, promover/rebaixar, redefinir senha).
import { BanIcon, EllipsisIcon, KeyRoundIcon, ShieldCheckIcon, ShieldOffIcon, UserCheckIcon } from "lucide-react"
import { motion } from "motion/react"
import type { User } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { userRoleLabels, userStatusLabels } from "@/hooks/use-users"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
    users: User[]
    currentUserId: string
    onToggleStatus: (user: User) => void
    onToggleRole: (user: User) => void
    onResetPassword: (user: User) => void
}

const initials = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")

export function UsersList({ users, currentUserId, onToggleStatus, onToggleRole, onResetPassword }: Props) {
    return (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {users.map((user, index) => {
                const isSelf = user.id === currentUserId
                const blocked = user.status === "blocked"
                return (
                    <motion.li
                        key={user.id}
                        layout="position"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn("flex items-center gap-3 px-4 py-3", blocked && "opacity-60")}
                    >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-medium text-accent-foreground text-xs">
                            {initials(user.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 truncate font-medium text-sm">
                                {user.name}
                                {isSelf ? <span className="text-muted-foreground text-xs">(você)</span> : null}
                            </p>
                            <p className="truncate text-muted-foreground text-xs">
                                {user.email} · desde {formatDate(user.createdAt.slice(0, 10))}
                            </p>
                        </div>
                        <div className="hidden items-center gap-2 sm:flex">
                            {user.role === "super_admin" ? (
                                <Badge variant="outline" className="gap-1 border-income/30 bg-income/10 font-normal text-income">
                                    <ShieldCheckIcon className="size-3" />
                                    {userRoleLabels.super_admin}
                                </Badge>
                            ) : null}
                            {blocked ? (
                                <Badge className="border-transparent bg-foreground font-normal text-background">
                                    {userStatusLabels.blocked}
                                </Badge>
                            ) : null}
                        </div>
                        {/* O próprio super admin não se bloqueia nem se rebaixa (o backend também recusa). */}
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon-sm" aria-label={`Ações de ${user.name}`} />}
                            >
                                <EllipsisIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onResetPassword(user)}>
                                    <KeyRoundIcon />
                                    Redefinir senha
                                </DropdownMenuItem>
                                {isSelf ? null : (
                                    <>
                                        <DropdownMenuItem onClick={() => onToggleRole(user)}>
                                            {user.role === "super_admin" ? <ShieldOffIcon /> : <ShieldCheckIcon />}
                                            {user.role === "super_admin" ? "Tornar usuário comum" : "Tornar super admin"}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            variant={blocked ? "default" : "destructive"}
                                            onClick={() => onToggleStatus(user)}
                                        >
                                            {blocked ? <UserCheckIcon /> : <BanIcon />}
                                            {blocked ? "Desbloquear" : "Bloquear acesso"}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </motion.li>
                )
            })}
        </ul>
    )
}
