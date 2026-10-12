// QueryClient único do app: sem retry automático e sem refetch ao focar a janela.
import { QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiError, isSessionError } from "./api"

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error, query) => {
            // Sessão caindo (logout ou token expirado) não é erro de leitura: o redirecionamento pro login já avisa.
            if (isSessionError(error)) return
            // Leituras falhando viram um toast só por query (mutations já têm o próprio toast).
            toast.error(apiError(error, "Não foi possível carregar os dados"), { id: `query-${query.queryHash}` })
        },
    }),
    defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
    },
})
