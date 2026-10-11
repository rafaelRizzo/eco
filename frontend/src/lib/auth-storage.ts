// Persistência do JWT no localStorage (o backend usa Authorization: Bearer, não cookie).
const TOKEN_KEY = "eco.token"

export const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY)
    } catch {
        return null
    }
}

export const setToken = (token: string) => {
    try {
        localStorage.setItem(TOKEN_KEY, token)
    } catch {
        // Modo privado/armazenamento bloqueado: a sessão dura só enquanto a aba estiver aberta.
    }
}

export const clearToken = () => {
    try {
        localStorage.removeItem(TOKEN_KEY)
    } catch {
        // idem
    }
}

// Avisa quando OUTRA aba apaga o token (logout lá): o evento "storage" só dispara nas demais abas, nunca na própria.
export const onTokenRemoved = (callback: () => void) => {
    const handler = (event: StorageEvent) => {
        if (event.key === TOKEN_KEY && event.newValue === null) callback()
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
}
