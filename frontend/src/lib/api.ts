// Instância axios única: anexa o token, derruba a sessão em 401 e traduz erro do backend pra mensagem legível.
import axios, { AxiosError } from "axios"
import { clearToken, getToken } from "./auth-storage"

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3333",
    timeout: 15_000,
})

// Endpoints que funcionam sem token (o resto da API é autenticada).
const PUBLIC_ENDPOINTS = ["/auth/login", "/auth/register", "/setup"]

api.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    } else if (!PUBLIC_ENDPOINTS.includes(config.url ?? "")) {
        // Sem sessão (ex.: query que ainda estava montada durante o logout): nem sai pra rede, senão volta 401 "Não autenticado".
        return Promise.reject(new axios.CanceledError("Sem sessão", undefined, config))
    }
    return config
})

const PUBLIC_PATHS = ["/login", "/register", "/setup"]

// Erro que não merece toast: requisição barrada por falta de sessão ou 401 (o interceptor já cuida de levar pro login).
export const isSessionError = (error: unknown) =>
    axios.isCancel(error) || (axios.isAxiosError(error) && error.response?.status === 401)

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Token expirado/inválido: volta pro login (exceto se o 401 veio do próprio login ou do logout, que já está saindo).
        const leaving = error.config?.url === "/auth/logout"
        if (error.response?.status === 401 && !leaving && !PUBLIC_PATHS.includes(window.location.pathname)) {
            clearToken()
            window.location.assign(`/login?expired=1`)
        }
        return Promise.reject(error)
    },
)

type BackendError = { message?: string; errors?: { path: string; message: string }[] }

const STATUS_FALLBACK: Record<number, string> = {
    400: "Confira os dados informados",
    401: "Sua sessão expirou, entre de novo",
    404: "Não encontramos esse registro",
    409: "Essa ação conflita com dados existentes",
    429: "Muitas tentativas, espere um minuto",
    500: "O servidor falhou, tente de novo em instantes",
}

// Ordem: erro de validação do backend > mensagem do backend > fallback por status > rede > fallback.
export const apiError = (err: unknown, fallback: string) => {
    if (!axios.isAxiosError<BackendError>(err)) return fallback
    if (!err.response) return "Sem conexão com o servidor"

    const data = err.response.data
    const firstIssue = data?.errors?.[0]
    if (firstIssue) return firstIssue.message
    if (data?.message) return data.message
    return STATUS_FALLBACK[err.response.status] ?? fallback
}
