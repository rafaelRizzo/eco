// Tipos das variáveis de ambiente de build do Vite.
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
