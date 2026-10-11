// Notificações geradas pelos crons: lista, contador de não lidas e marcar como lida.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { withToast } from "@/lib/mutation"

export type NotificationType = "bill_due" | "bill_overdue" | "invoice_closed" | "invoice_due" | "invoice_overdue"

export type Notification = {
    id: string
    type: NotificationType
    title: string
    message: string
    transactionId: string | null
    invoiceId: string | null
    readAt: string | null
    createdAt: string
}

type NotificationsResponse = { notifications: Notification[]; unreadCount: number }

export function useNotifications() {
    const queryClient = useQueryClient()
    const { data, isLoading: loading } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => (await api.get<NotificationsResponse>("/notifications", { params: { limit: 30 } })).data,
        // Os crons geram aviso sem o usuário fazer nada: checa de tempos em tempos.
        refetchInterval: 60_000,
    })

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] })

    const readMutation = useMutation({
        mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
        onSuccess: invalidate,
    })
    const readAllMutation = useMutation({
        mutationFn: async () => api.post("/notifications/read-all"),
        onSuccess: invalidate,
    })

    const markAsRead = async (id: string) => {
        try {
            await readMutation.mutateAsync(id)
            return true
        } catch {
            return false
        }
    }

    const markAllAsRead = async () =>
        !!(await withToast(() => readAllMutation.mutateAsync(), {
            loading: "Marcando...",
            success: "Tudo lido",
            error: "Não foi possível marcar como lidas",
        }))

    return {
        notifications: data?.notifications ?? [],
        unreadCount: data?.unreadCount ?? 0,
        loading,
        markAsRead,
        markAllAsRead,
    }
}
