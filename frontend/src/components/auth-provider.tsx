// Sessão do usuário: token no localStorage + /auth/me via React Query; expõe login, cadastro, setup inicial e logout.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { createContext, useContext, useEffect, useRef } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { setupStatusQueryKey } from "@/hooks/use-setup"
import { api } from "@/lib/api"
import { clearToken, getToken, onTokenRemoved, setToken } from "@/lib/auth-storage"

export type UserRole = "super_admin" | "user"
export type UserStatus = "active" | "blocked"

export type User = {
    id: string
    name: string
    email: string
    role: UserRole
    status: UserStatus
    avatarUpdatedAt: string | null
    createdAt: string
}

const email = () => z.string().trim().pipe(z.email("Informe um e-mail válido"))
const password = () => z.string().min(8, "A senha precisa ter ao menos 8 caracteres")
const name = () => z.string().trim().min(2, "O nome precisa ter ao menos 2 letras")

export const loginSchema = z.object({
    email: email(),
    password: z.string().min(1, "Informe a senha"),
})

export const registerSchema = z.object({ name: name(), email: email(), password: password() })

export const setupSchema = z.object({
    setupToken: z.string().trim().min(1, "Informe o token de configuração"),
    name: name(),
    email: email(),
    password: password(),
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type SetupForm = z.infer<typeof setupSchema>

type AuthResponse = { token: string; user: User }

type AuthContextValue = {
    user: User | null
    isSuperAdmin: boolean
    loading: boolean
    login: (form: LoginForm) => Promise<User>
    register: (form: RegisterForm) => Promise<User>
    completeSetup: (form: SetupForm) => Promise<User>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const loggingOut = useRef(false)

    const { data: user = null, isLoading } = useQuery({
        queryKey: ["me"],
        queryFn: async () => (await api.get<{ user: User }>("/auth/me")).data.user,
        enabled: !!getToken(),
        staleTime: Number.POSITIVE_INFINITY,
    })

    const startSession = ({ token, user }: AuthResponse) => {
        setToken(token)
        queryClient.setQueryData(["me"], user)
        return user
    }

    const loginMutation = useMutation({
        mutationFn: async (form: LoginForm) => (await api.post<AuthResponse>("/auth/login", form)).data,
        onSuccess: startSession,
    })

    const registerMutation = useMutation({
        mutationFn: async (form: RegisterForm) => (await api.post<AuthResponse>("/auth/register", form)).data,
        onSuccess: startSession,
    })

    const setupMutation = useMutation({
        mutationFn: async (form: SetupForm) => (await api.post<AuthResponse>("/setup", form)).data,
        onSuccess: (data) => {
            // Setup feito: as telas de login/cadastro param de redirecionar pra /setup.
            queryClient.invalidateQueries({ queryKey: setupStatusQueryKey })
            return startSession(data)
        },
    })

    // Navega ANTES de limpar o cache: com as telas autenticadas ainda montadas, clear() as faria refazer as queries
    // sem token (401 em cascata e "sessão expirada" no login).
    const leaveToLogin = async () => {
        await navigate({ to: "/login", search: {}, replace: true })
        queryClient.clear()
    }

    const logout = async () => {
        if (loggingOut.current) return
        loggingOut.current = true
        try {
            // Revoga o token no servidor; se a API estiver fora do ar ou o token já tiver expirado, sai localmente do mesmo jeito.
            if (getToken()) await api.post("/auth/logout", null, { timeout: 5000 }).catch(() => undefined)
        } finally {
            clearToken()
            await leaveToLogin()
            toast.success("Você saiu da conta")
            loggingOut.current = false
        }
    }

    // Logout em outra aba: esta também sai (o token sumiu do localStorage).
    // biome-ignore lint/correctness/useExhaustiveDependencies: leaveToLogin só usa navigate/queryClient, estáveis.
    useEffect(() => onTokenRemoved(() => void leaveToLogin()), [])

    const value: AuthContextValue = {
        user,
        isSuperAdmin: user?.role === "super_admin",
        loading: isLoading,
        login: async (form) => (await loginMutation.mutateAsync(form)).user,
        register: async (form) => (await registerMutation.mutateAsync(form)).user,
        completeSetup: async (form) => (await setupMutation.mutateAsync(form)).user,
        logout,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>")
    return context
}
