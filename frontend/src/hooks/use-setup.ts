// Status do bootstrap (GET /setup): se a configuração inicial já foi feita e se o cadastro público está aberto.
import { type QueryClient, queryOptions, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type SetupStatus = { completed: boolean; signupEnabled: boolean }

export const setupStatusQueryKey = ["setup"] as const

export const setupStatusQuery = queryOptions({
    queryKey: setupStatusQueryKey,
    queryFn: async () => (await api.get<SetupStatus>("/setup")).data,
    staleTime: 60_000,
})

// Usado no beforeLoad das rotas públicas. API fora do ar não pode travar o login: assume "configurado".
export const loadSetupStatus = async (queryClient: QueryClient): Promise<SetupStatus> => {
    try {
        return await queryClient.ensureQueryData(setupStatusQuery)
    } catch {
        return { completed: true, signupEnabled: false }
    }
}

export function useSetupStatus() {
    const { data, isLoading: loading } = useQuery(setupStatusQuery)
    return { completed: data?.completed ?? true, signupEnabled: data?.signupEnabled ?? false, loading }
}
