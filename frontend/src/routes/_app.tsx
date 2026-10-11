// Layout autenticado (rota sem path): guarda de sessão, sidebar, barra superior e transição de página.
import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router"
import { motion } from "motion/react"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationsPopover } from "@/components/Notifications/notifications-popover"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { getToken } from "@/lib/auth-storage"

export const Route = createFileRoute("/_app")({
    beforeLoad: () => {
        if (!getToken()) throw redirect({ to: "/login", search: {} })
    },
    component: AppLayout,
})

// O Sidebar do shadcn grava o estado (aberto/recolhido) num cookie, mas não lê de volta no SPA.
const readSidebarOpen = () => {
    try {
        return !document.cookie.split("; ").includes("sidebar_state=false")
    } catch {
        return true
    }
}

function AppLayout() {
    const { pathname } = useLocation()

    return (
        <SidebarProvider defaultOpen={readSidebarOpen()}>
            <AppSidebar />
            {/* overflow-clip: o y da transição de página empurra o conteúdo 10px pra baixo e criava scroll durante a animação. */}
            <SidebarInset className="min-w-0 overflow-clip">
                {/* pl-3 (e não o sm:px-8 do conteúdo): o toggle fica centrado entre a borda da sidebar e a linha do separator
                    (~18px de cada lado, contando o respiro interno de 6px do botão). A direita segue alinhada ao conteúdo. */}
                <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-1 border-b bg-background/80 pr-4 pl-3 backdrop-blur sm:pr-8">
                    {/* Padrão do sofon-pabx (gap-2 e linha de altura total). A margem do separator é assimétrica de propósito:
                        o botão do toggle tem ~6px de respiro interno que o texto do breadcrumb não tem, então ml-1/mr-3
                        deixa ~20px visíveis dos dois lados da linha. */}
                    <div className="mr-auto flex min-w-0 items-center gap-2 self-stretch">
                        <SidebarTrigger />
                        <Separator orientation="vertical" className="ml-1 mr-3" />
                        <AppBreadcrumb />
                    </div>
                    <NotificationsPopover />
                    <ThemeToggle />
                </header>
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 pt-6 pb-12 sm:px-8"
                >
                    <Outlet />
                </motion.div>
            </SidebarInset>
        </SidebarProvider>
    )
}
