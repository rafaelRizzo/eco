// Sino de notificações: contador de não lidas e lista dos avisos gerados pelos crons (vencimentos, faturas).
import { AlarmClockIcon, BellIcon, CheckCheckIcon, ReceiptIcon, TriangleAlertIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { type NotificationType, useNotifications } from "@/hooks/use-notifications"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const ICONS: Record<NotificationType, { icon: typeof BellIcon; className: string }> = {
    bill_due: { icon: AlarmClockIcon, className: "text-due" },
    invoice_due: { icon: AlarmClockIcon, className: "text-due" },
    bill_overdue: { icon: TriangleAlertIcon, className: "text-expense" },
    invoice_overdue: { icon: TriangleAlertIcon, className: "text-expense" },
    invoice_closed: { icon: ReceiptIcon, className: "text-primary" },
}

export function NotificationsPopover() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative"
                        aria-label={unreadCount ? `${unreadCount} notificações não lidas` : "Notificações"}
                    />
                }
            >
                <BellIcon />
                <AnimatePresence>
                    {unreadCount > 0 ? (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-due px-1 font-mono font-medium text-[0.65rem] text-sidebar leading-4"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </motion.span>
                    ) : null}
                </AnimatePresence>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="font-heading font-semibold">Avisos</p>
                    {unreadCount > 0 ? (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                            <CheckCheckIcon />
                            Marcar tudo como lido
                        </Button>
                    ) : null}
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <p className="px-4 py-6 text-muted-foreground text-sm">Carregando...</p>
                    ) : notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-muted-foreground text-sm">
                            Nenhum aviso por enquanto. Contas e faturas perto do vencimento aparecem aqui.
                        </p>
                    ) : (
                        <ul>
                            {notifications.map((notification) => {
                                const { icon: Icon, className } = ICONS[notification.type]
                                const unread = !notification.readAt
                                return (
                                    <li key={notification.id}>
                                        <button
                                            type="button"
                                            onClick={() => unread && markAsRead(notification.id)}
                                            className={cn(
                                                "flex w-full gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60",
                                                unread && "bg-accent/40",
                                            )}
                                        >
                                            <Icon className={cn("mt-0.5 size-4 shrink-0", className)} />
                                            <span className="min-w-0 flex-1 space-y-0.5">
                                                <span className="block font-medium text-sm">{notification.title}</span>
                                                <span className="block text-muted-foreground text-sm">
                                                    {notification.message}
                                                </span>
                                                <span className="block text-muted-foreground text-xs">
                                                    {formatDateTime(notification.createdAt)}
                                                </span>
                                            </span>
                                            {unread ? (
                                                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-due" aria-label="Não lida" />
                                            ) : null}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
