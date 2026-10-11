// Helpers puros de data no formato "YYYY-MM-DD" (coluna `date` do Postgres), sem fuso: tudo em UTC.
// Fuso só entra em `todayIn`, pra saber que dia é "hoje" pro usuário (APP_TIMEZONE).

export type DateParts = { year: number; month: number; day: number }

const pad = (value: number, size = 2) => String(value).padStart(size, "0")

export const parseDate = (value: string): DateParts => {
    const [year, month, day] = value.split("-").map(Number)
    if (!year || !month || !day) throw new Error(`Data inválida: ${value}`)
    return { year, month, day }
}

export const formatDate = ({ year, month, day }: DateParts) => `${pad(year, 4)}-${pad(month)}-${pad(day)}`

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

// Dia 31 em fevereiro vira 28/29: vencimento "dia 31" sempre cai no último dia do mês.
export const clampDay = (year: number, month: number, day: number) => Math.min(day, daysInMonth(year, month))

export const shiftMonth = (year: number, month: number, delta: number) => {
    const index = year * 12 + (month - 1) + delta
    return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

// Soma meses mantendo o dia âncora (ex: âncora 31 -> 31/jan, 28/fev, 31/mar), em vez de acumular o clamp.
export const addMonths = (value: string, months: number, anchorDay?: number) => {
    const { year, month, day } = parseDate(value)
    const target = shiftMonth(year, month, months)
    return formatDate({ ...target, day: clampDay(target.year, target.month, anchorDay ?? day) })
}

export const addDays = (value: string, days: number) => {
    const { year, month, day } = parseDate(value)
    const date = new Date(Date.UTC(year, month - 1, day + days))
    return formatDate({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() })
}

export const toMonthKey = (value: string) => value.slice(0, 7)

export const monthRange = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number) as [number, number]
    return {
        start: formatDate({ year, month, day: 1 }),
        end: formatDate({ year, month, day: daysInMonth(year, month) }),
    }
}

export const todayIn = (timeZone: string, now = new Date()) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
