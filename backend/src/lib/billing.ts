// Regras puras de cobrança: ciclo de fatura do cartão, divisão de parcelas e próxima ocorrência de recorrência.
// Sem acesso a banco, pra serem testadas isoladamente (lib/__tests__/billing.unit.test.ts).
import { addDays, addMonths, clampDay, formatDate, parseDate, shiftMonth } from "./dates"

export type InvoiceCycle = { referenceMonth: string; closingDate: string; dueDate: string }

// Compra no dia do fechamento ou depois já cai na fatura seguinte (comportamento padrão dos bancos).
// referenceMonth é o mês do vencimento: "fatura de novembro" = fatura que vence em novembro.
export const resolveInvoiceCycle = (purchaseDate: string, closingDay: number, dueDay: number): InvoiceCycle => {
    const { year, month, day } = parseDate(purchaseDate)
    const closingThisMonth = clampDay(year, month, closingDay)
    const closing = day >= closingThisMonth ? shiftMonth(year, month, 1) : { year, month }
    const closingDate = formatDate({ ...closing, day: clampDay(closing.year, closing.month, closingDay) })

    // Vencimento depois do fechamento no mesmo mês; senão, no mês seguinte.
    const due = dueDay > closingDay ? closing : shiftMonth(closing.year, closing.month, 1)
    const dueDate = formatDate({ ...due, day: clampDay(due.year, due.month, dueDay) })

    return { referenceMonth: dueDate.slice(0, 7), closingDate, dueDate }
}

// Divide o total em N parcelas inteiras; o resto dos centavos vai pra primeira parcela.
export const splitInstallments = (totalCents: number, count: number) => {
    const base = Math.floor(totalCents / count)
    const remainder = totalCents - base * count
    return Array.from({ length: count }, (_, index) => (index === 0 ? base + remainder : base))
}

export type Frequency = "weekly" | "monthly" | "yearly"

export const nextOccurrence = (current: string, frequency: Frequency, anchorDay: number) => {
    if (frequency === "weekly") return addDays(current, 7)
    if (frequency === "yearly") return addMonths(current, 12, anchorDay)
    return addMonths(current, 1, anchorDay)
}
