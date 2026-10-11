// Simulação de juros compostos para FIIs: aporte mensal, taxa (yield) e reinvestimento dos proventos, mês a mês.
// Estimativa em ponto flutuante (centavos fracionados) arredondada só na saída; não é dado persistido.

export type RatePeriod = "monthly" | "yearly"

export type SimulationInput = {
    initialCents: number
    monthlyCents: number
    // Taxa em % (ex.: 0,8) no período informado em `ratePeriod`.
    ratePercent: number
    ratePeriod: RatePeriod
    // % dos proventos que volta pra carteira (0 a 100); o resto é gasto/sacado.
    reinvestPercent: number
    years: number
}

export type YearRow = {
    year: number
    investedCents: number
    balanceCents: number
    // Proventos recebidos no ano (reinvestidos ou não).
    incomeCents: number
    // Renda mensal estimada no fim do ano (patrimônio x taxa mensal).
    monthlyIncomeCents: number
}

export type SimulationResult = {
    rows: YearRow[]
    investedCents: number
    balanceCents: number
    totalIncomeCents: number
    withdrawnIncomeCents: number
    monthlyIncomeCents: number
    monthlyRatePercent: number
}

// Taxa anual equivale à mensal composta: (1 + a)^(1/12) - 1.
export const toMonthlyRate = (ratePercent: number, period: RatePeriod) => {
    const rate = ratePercent / 100
    return period === "monthly" ? rate : (1 + rate) ** (1 / 12) - 1
}

export function simulateCompoundInterest(input: SimulationInput): SimulationResult {
    const monthlyRate = toMonthlyRate(input.ratePercent, input.ratePeriod)
    const reinvest = Math.min(Math.max(input.reinvestPercent, 0), 100) / 100

    let balance = input.initialCents
    let invested = input.initialCents
    let totalIncome = 0
    let withdrawnIncome = 0
    const rows: YearRow[] = []

    for (let year = 1; year <= input.years; year++) {
        let incomeOfYear = 0
        for (let month = 0; month < 12; month++) {
            // O provento do mês vem da carteira que já existia; o aporte entra no fim do mês.
            const income = balance * monthlyRate
            incomeOfYear += income
            withdrawnIncome += income * (1 - reinvest)
            balance += income * reinvest + input.monthlyCents
            invested += input.monthlyCents
        }
        totalIncome += incomeOfYear
        rows.push({
            year,
            investedCents: Math.round(invested),
            balanceCents: Math.round(balance),
            incomeCents: Math.round(incomeOfYear),
            monthlyIncomeCents: Math.round(balance * monthlyRate),
        })
    }

    return {
        rows,
        investedCents: Math.round(invested),
        balanceCents: Math.round(balance),
        totalIncomeCents: Math.round(totalIncome),
        withdrawnIncomeCents: Math.round(withdrawnIncome),
        monthlyIncomeCents: Math.round(balance * monthlyRate),
        monthlyRatePercent: monthlyRate * 100,
    }
}
