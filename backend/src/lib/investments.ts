// Regras puras de investimentos: posição/preço médio, valor atual, alocação e projeção de proventos de FIIs.
// Tudo em centavos de BRL; quantidade é fracionada (cripto/dólar), arredondada em 8 casas.
import { addMonths, toMonthKey } from "./dates"

export type TradeLike = {
    type: "buy" | "sell"
    quantity: number
    unitPriceCents: number
    feesCents: number
    tradedAt: string
    createdAt: Date
}

export type Position = { quantity: number; avgPriceCents: number; costCents: number }

// Lançada quando uma venda deixaria a posição negativa; o service converte em AppError 409.
export class PositionError extends Error {}

const round8 = (value: number) => Math.round(value * 1e8) / 1e8

// No mesmo dia compras vêm antes das vendas, pra não acusar posição negativa por ordem de digitação.
const compareTrades = (a: TradeLike, b: TradeLike) =>
    a.tradedAt.localeCompare(b.tradedAt) ||
    (a.type === b.type ? 0 : a.type === "buy" ? -1 : 1) ||
    a.createdAt.getTime() - b.createdAt.getTime()

// Preço médio ponderado: compra soma quantidade e custo (com taxas); venda sai ao preço médio vigente.
export const computePosition = (trades: TradeLike[]): Position => {
    let quantity = 0
    let cost = 0
    for (const trade of [...trades].sort(compareTrades)) {
        if (trade.type === "buy") {
            cost += trade.quantity * trade.unitPriceCents + trade.feesCents
            quantity = round8(quantity + trade.quantity)
            continue
        }
        if (trade.quantity > quantity) throw new PositionError("A venda é maior que a quantidade em carteira")
        cost -= (cost / quantity) * trade.quantity
        quantity = round8(quantity - trade.quantity)
        if (quantity === 0) cost = 0
    }
    return {
        quantity,
        avgPriceCents: quantity > 0 ? Math.round(cost / quantity) : 0,
        costCents: Math.round(cost),
    }
}

// Sem cotação informada, avalia pelo preço médio e sinaliza `priceMissing`.
export const valuePosition = (position: Position, currentPriceCents: number | null) => {
    const price = currentPriceCents ?? position.avgPriceCents
    const valueCents = Math.round(position.quantity * price)
    const profitCents = valueCents - position.costCents
    return {
        valueCents,
        profitCents,
        profitPercent: position.costCents > 0 ? Math.round((profitCents / position.costCents) * 10000) / 100 : null,
        priceMissing: currentPriceCents === null,
    }
}

export type ClassTotal<C extends string> = { class: C; valueCents: number; percent: number }

export const summarizePortfolio = <C extends string>(items: { class: C; valueCents: number; costCents: number }[]) => {
    const totalValueCents = items.reduce((sum, item) => sum + item.valueCents, 0)
    const totalCostCents = items.reduce((sum, item) => sum + item.costCents, 0)
    const byClassMap = new Map<C, number>()
    for (const item of items) byClassMap.set(item.class, (byClassMap.get(item.class) ?? 0) + item.valueCents)
    const byClass: ClassTotal<C>[] = [...byClassMap]
        .filter(([, valueCents]) => valueCents > 0)
        .map(([cls, valueCents]) => ({
            class: cls,
            valueCents,
            percent: totalValueCents > 0 ? Math.round((valueCents / totalValueCents) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.valueCents - a.valueCents)
    return { totalValueCents, totalCostCents, profitCents: totalValueCents - totalCostCents, byClass }
}

export type DividendFrequency = "none" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual"

// Meses entre um pagamento e o seguinte; `none` não projeta nada.
export const FREQUENCY_STEP: Record<DividendFrequency, number> = {
    none: 0,
    monthly: 1,
    bimonthly: 2,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
}

// `expectedUnitCents` / `nextDate`: provento por cota esperado (centavos, fracionado) e data do próximo pagamento
// informados no ativo; valem quando não há provento lançado ou quando a data é mais recente que o último lançado.
export type ProjectionAsset = {
    id: string
    frequency: DividendFrequency
    quantity: number
    expectedUnitCents?: number | null
    nextDate?: string | null
}
// `unitCents`: valor por cota em centavos (fracionado); sem ele cai em totalCents / quantity.
export type RecordedDividend = {
    assetId: string
    payDate: string
    totalCents: number
    quantity: number
    unitCents?: number
}
export type EstimatedDividend = { assetId: string; payDate: string; totalCents: number; quantity: number; unitCents: number }

const monthsBetween = (fromMonth: string, toMonth: string) => {
    const [fy, fm] = fromMonth.split("-").map(Number) as [number, number]
    const [ty, tm] = toMonth.split("-").map(Number) as [number, number]
    return (ty - fy) * 12 + (tm - fm)
}

// Estima os próximos pagamentos pela recorrência do ativo: valor por cota × cotas atuais, repetido a cada N meses
// a partir de uma âncora (o último provento lançado ou a "próxima data" do ativo, o que for mais recente).
// Só meses atual/futuros de `months` sem provento lançado; âncora parada (mais de 2 ciclos) não projeta.
// Valor por cota: o informado no ativo, senão o do último provento lançado.
export const projectDividends = (
    assets: ProjectionAsset[],
    recorded: RecordedDividend[],
    months: string[],
    today: string,
): EstimatedDividend[] => {
    const currentMonth = toMonthKey(today)
    const estimates: EstimatedDividend[] = []

    for (const asset of assets) {
        const step = FREQUENCY_STEP[asset.frequency]
        if (step === 0 || asset.quantity <= 0) continue
        const own = recorded.filter((dividend) => dividend.assetId === asset.id)
        const last = own.reduce<RecordedDividend | null>((acc, d) => (!acc || d.payDate > acc.payDate ? d : acc), null)

        const next = asset.nextDate ?? null
        const anchorIsNext = next !== null && (!last || next > last.payDate)
        const anchorDate = anchorIsNext ? next : (last?.payDate ?? null)
        if (!anchorDate) continue
        const anchorMonth = toMonthKey(anchorDate)
        if (monthsBetween(anchorMonth, currentMonth) > step * 2 + 1) continue

        const unitCents = asset.expectedUnitCents ?? (last ? (last.unitCents ?? last.totalCents / last.quantity) : null)
        if (unitCents === null || unitCents <= 0) continue
        const totalCents = Math.round(unitCents * asset.quantity)
        if (totalCents <= 0) continue

        // Âncora lançada já existe como provento real; a "próxima data" ainda não, então o próprio mês dela conta.
        const minDistance = anchorIsNext ? 0 : 1
        for (const monthKey of months) {
            if (monthKey < currentMonth) continue
            const distance = monthsBetween(anchorMonth, monthKey)
            if (distance < minDistance || distance % step !== 0) continue
            if (own.some((dividend) => toMonthKey(dividend.payDate) === monthKey)) continue
            // addMonths mantém o dia da âncora com clamp no fim do mês (31 -> 28/fev).
            const payDate = addMonths(anchorDate, distance)
            estimates.push({ assetId: asset.id, payDate, totalCents, quantity: asset.quantity, unitCents })
        }
    }
    return estimates
}
