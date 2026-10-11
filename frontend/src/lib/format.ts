// Formatação na borda: centavos -> BRL e datas "YYYY-MM-DD" -> texto pt-BR (sem passar por fuso).
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export const formatCents = (cents: number) => brl.format(cents / 100)

// "2026-10-15" é data sem hora: parseISO trata como local, então não "volta um dia" por causa do UTC.
export const formatDate = (value: string, pattern = "dd/MM/yyyy") => format(parseISO(value), pattern, { locale: ptBR })

export const formatDateTime = (value: string) => format(new Date(value), "dd/MM 'às' HH:mm", { locale: ptBR })

export const formatMonth = (monthKey: string, pattern = "MMMM 'de' yyyy") =>
    format(parseISO(`${monthKey}-01`), pattern, { locale: ptBR })

export const todayKey = () => format(new Date(), "yyyy-MM-dd")

export const currentMonthKey = () => format(new Date(), "yyyy-MM")

export const shiftMonthKey = (monthKey: string, delta: number) => {
    const [year, month] = monthKey.split("-").map(Number) as [number, number]
    const index = year * 12 + (month - 1) + delta
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`
}

// Português só capitaliza a primeira letra ("Quinta-feira, 22 de outubro"); CSS capitalize erraria o "De".
export const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
