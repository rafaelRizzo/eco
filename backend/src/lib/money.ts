// Formatação de centavos pra texto em pt-BR (usado nas mensagens de notificação).
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export const formatCents = (cents: number) => brl.format(cents / 100)

// "2026-10-15" -> "15/10/2026"
export const formatDateBr = (value: string) => value.split("-").reverse().join("/")
