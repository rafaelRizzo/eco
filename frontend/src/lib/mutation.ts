// Padrão de toast das mutations (loading -> success/error, nunca silencioso) e invalidação do que mexe em saldo.
import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiError } from "./api"

type ToastMessages = { loading: string; success: string; error: string }

// Devolve o resultado ou null em caso de erro: quem chama decide se fecha o dialog.
export const withToast = async <T>(run: () => Promise<T>, messages: ToastMessages): Promise<T | null> => {
    const id = toast.loading(messages.loading)
    try {
        const result = await run()
        toast.success(messages.success, { id })
        return result
    } catch (err) {
        toast.error(apiError(err, messages.error), { id })
        return null
    }
}

// Lançamento, fatura e recorrência alteram saldo, limite, relatórios e notificações ao mesmo tempo.
export const invalidateMoney = (queryClient: QueryClient) =>
    Promise.all(
        ["transactions", "accounts", "credit-cards", "invoices", "reports", "recurring-transactions", "notifications"].map(
            (key) => queryClient.invalidateQueries({ queryKey: [key] }),
        ),
    )

// Carteira, operações e proventos mudam juntos (posição afeta estimativa de provento); não mexem em saldo de conta.
export const invalidateInvestments = (queryClient: QueryClient) =>
    Promise.all(
        ["assets", "asset-trades", "dividends"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
