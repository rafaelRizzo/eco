// Navegação principal: Sidebar do shadcn (recolhe pra ícones no desktop, vira Sheet no celular).
// O marcador do item ativo desliza entre os itens (layoutId do Motion).
import { Link, useLocation } from "@tanstack/react-router"
import {
    ArrowLeftRightIcon,
    CalculatorIcon,
    CreditCardIcon,
    LayoutDashboardIcon,
    LineChartIcon,
    LogOutIcon,
    RepeatIcon,
    ShieldCheckIcon,
    TagsIcon,
    UsersIcon,
    WalletIcon,
} from "lucide-react"
import { motion } from "motion/react"
import { useAuth } from "@/components/auth-provider"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import { UserAvatar } from "@/components/user-avatar"

type NavItem = {
    to: "/dashboard" | "/transactions" | "/accounts" | "/credit-cards" | "/recurring" | "/categories" | "/investments" | "/simulators" | "/users"
    label: string
    icon: typeof WalletIcon
}

type NavGroup = {
    label: string
    items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
    {
        label: "Principal",
        items: [
            { to: "/dashboard", label: "Painel", icon: LayoutDashboardIcon },
            { to: "/transactions", label: "Lançamentos", icon: ArrowLeftRightIcon },
            { to: "/accounts", label: "Contas", icon: WalletIcon },
            { to: "/credit-cards", label: "Cartões", icon: CreditCardIcon },
            { to: "/recurring", label: "Recorrências", icon: RepeatIcon },
            { to: "/categories", label: "Categorias", icon: TagsIcon },
            { to: "/investments", label: "Investimentos", icon: LineChartIcon },
            { to: "/simulators", label: "Simuladores", icon: CalculatorIcon },
        ],
    },
]

// Só aparece pro super admin (a rota e a API também barram os demais).
const ADMIN_GROUP: NavGroup = {
    label: "Administração",
    items: [{ to: "/users", label: "Usuários", icon: UsersIcon }],
}

// Logo: duas linhas de régua com um marcador, o mesmo desenho da régua do mês.
function EcoMark() {
    return (
        <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
            <rect width="32" height="32" rx="8" className="fill-sidebar-accent" />
            <path d="M8 20h16M8 12h16" className="stroke-sidebar-primary" strokeWidth="3" strokeLinecap="round" />
            <circle cx="20" cy="12" r="3" className="fill-primary" />
        </svg>
    )
}

export function AppSidebar() {
    const { pathname } = useLocation()
    const { user, isSuperAdmin, logout } = useAuth()
    const { isMobile, setOpenMobile } = useSidebar()
    const groups = isSuperAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS

    // No celular a sidebar é um Sheet: fecha ao navegar.
    const closeOnMobile = () => {
        if (isMobile) setOpenMobile(false)
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                {/* Link próprio (não SidebarMenuButton): o botão força svg em size-4 e encolheria o logo. A marca de 32px
                    ocupa exatamente a largura útil da sidebar recolhida (3rem - p-2) e o texto some. */}
                <Link
                    to="/dashboard"
                    onClick={closeOnMobile}
                    aria-label="eco, ir para o painel"
                    className="flex items-center gap-2 rounded-lg outline-hidden ring-sidebar-ring focus-visible:ring-2"
                >
                    <EcoMark />
                    <span className="font-heading font-semibold text-2xl text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
                        eco
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {groups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1">
                                {group.items.map(({ to, label, icon: Icon }) => {
                                    const active = pathname.startsWith(to)
                                    return (
                                        <SidebarMenuItem key={to}>
                                            <SidebarMenuButton
                                                isActive={active}
                                                tooltip={label}
                                                className="relative"
                                                render={
                                                    <Link to={to} onClick={closeOnMobile}>
                                                        {active ? (
                                                            <motion.span
                                                                layoutId="nav-active"
                                                                aria-hidden
                                                                className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-sidebar-primary"
                                                                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                                            />
                                                        ) : null}
                                                        {/* Ícone carrega a cor (esmeralda no ativo) pra o item não sumir junto com o rótulo */}
                                                        <Icon className={active ? "text-sidebar-primary" : undefined} />
                                                        <span>{label}</span>
                                                    </Link>
                                                }
                                            />
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                {/* Card do usuário, leva ao perfil. Claro: contorno neutro sobre fundo quase branco (sidebar-accent a 50%).
                    Escuro: preenchimento um tom acima da sidebar com borda da mesma cor (some o contorno).
                    Recolhido: só o avatar, centralizado, sem o card. */}
                <Link
                    to="/profile"
                    onClick={closeOnMobile}
                    aria-label="Meu perfil"
                    className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2 outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 dark:border-sidebar-accent dark:bg-sidebar-accent dark:hover:bg-sidebar-accent/70"
                >
                    <UserAvatar user={user} className="size-8" />
                    <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                        <p className="truncate font-medium text-sidebar-accent-foreground text-sm">{user?.name}</p>
                        <p className="truncate text-sidebar-foreground text-xs">{user?.email}</p>
                        {isSuperAdmin ? (
                            <p className="mt-0.5 flex items-center gap-1 text-sidebar-primary text-xs">
                                <ShieldCheckIcon className="size-3.5" />
                                Super admin
                            </p>
                        ) : null}
                    </div>
                </Link>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Sair"
                            onClick={logout}
                            className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
                        >
                            <LogOutIcon />
                            <span>Sair</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
