// Testes das regras puras de investimentos: preço médio, avaliação, alocação e projeção de proventos.
import { describe, expect, it } from "bun:test"
import {
    computePosition,
    PositionError,
    projectDividends,
    summarizePortfolio,
    type TradeLike,
    valuePosition,
} from "../investments"

let seq = 0
const trade = (
    type: "buy" | "sell",
    quantity: number,
    unitPriceCents: number,
    tradedAt: string,
    feesCents = 0,
): TradeLike => ({
    type,
    quantity,
    unitPriceCents,
    feesCents,
    tradedAt,
    createdAt: new Date(2026, 0, 1, 0, 0, seq++),
})

describe("computePosition", () => {
    it("calcula preço médio ponderado incluindo taxas", () => {
        const position = computePosition([
            trade("buy", 10, 1000, "2026-01-01", 100),
            trade("buy", 10, 2000, "2026-01-02"),
        ])
        expect(position).toEqual({ quantity: 20, avgPriceCents: 1505, costCents: 30100 })
    })

    it("venda parcial mantém o preço médio", () => {
        const position = computePosition([trade("buy", 10, 1000, "2026-01-01"), trade("sell", 4, 3000, "2026-01-05")])
        expect(position).toEqual({ quantity: 6, avgPriceCents: 1000, costCents: 6000 })
    })

    it("venda total zera a posição", () => {
        const position = computePosition([trade("buy", 5, 1000, "2026-01-01"), trade("sell", 5, 1200, "2026-01-02")])
        expect(position).toEqual({ quantity: 0, avgPriceCents: 0, costCents: 0 })
    })

    it("recusa venda acima da posição", () => {
        expect(() =>
            computePosition([trade("buy", 1, 1000, "2026-01-01"), trade("sell", 2, 1000, "2026-01-02")]),
        ).toThrow(PositionError)
    })

    it("no mesmo dia a compra vale antes da venda, mesmo lançada depois", () => {
        const sell = trade("sell", 1, 1000, "2026-01-01")
        const buy = trade("buy", 1, 1000, "2026-01-01")
        expect(computePosition([sell, buy]).quantity).toBe(0)
    })

    it("aceita quantidade fracionada sem sobra de ponto flutuante", () => {
        const position = computePosition([
            trade("buy", 0.1, 100000, "2026-01-01"),
            trade("buy", 0.2, 100000, "2026-01-02"),
        ])
        expect(position.quantity).toBe(0.3)
    })
})

describe("valuePosition", () => {
    const position = { quantity: 10, avgPriceCents: 1000, costCents: 10000 }

    it("usa a cotação atual e calcula lucro", () => {
        expect(valuePosition(position, 1500)).toEqual({
            valueCents: 15000,
            profitCents: 5000,
            profitPercent: 50,
            priceMissing: false,
        })
    })

    it("sem cotação cai no preço médio e sinaliza", () => {
        expect(valuePosition(position, null)).toMatchObject({ valueCents: 10000, profitCents: 0, priceMissing: true })
    })
})

describe("summarizePortfolio", () => {
    it("agrupa por classe com percentual, ordenado por valor", () => {
        const summary = summarizePortfolio([
            { class: "stock", valueCents: 7500, costCents: 5000 },
            { class: "reit", valueCents: 2000, costCents: 2000 },
            { class: "reit", valueCents: 500, costCents: 400 },
        ])
        expect(summary.totalValueCents).toBe(10000)
        expect(summary.profitCents).toBe(2600)
        expect(summary.byClass).toEqual([
            { class: "stock", valueCents: 7500, percent: 75 },
            { class: "reit", valueCents: 2500, percent: 25 },
        ])
    })

    it("carteira vazia não divide por zero", () => {
        expect(summarizePortfolio([])).toEqual({ totalValueCents: 0, totalCostCents: 0, profitCents: 0, byClass: [] })
    })
})

describe("projectDividends", () => {
    const today = "2026-10-10"
    const months = ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]
    const monthly = { id: "a1", frequency: "monthly" as const, quantity: 200 }

    it("mensal: estima meses atual e futuros sem provento lançado, mantendo o dia", () => {
        const recorded = [{ assetId: "a1", payDate: "2026-09-15", totalCents: 5000, quantity: 100 }]
        const result = projectDividends([monthly], recorded, months, today)
        expect(result.map((e) => e.payDate)).toEqual(["2026-10-15", "2026-11-15", "2026-12-15", "2027-01-15"])
        expect(result[0]).toMatchObject({ totalCents: 10000, quantity: 200, unitCents: 50 })
    })

    it("não estima o mês que já tem provento lançado", () => {
        const recorded = [
            { assetId: "a1", payDate: "2026-09-15", totalCents: 5000, quantity: 100 },
            { assetId: "a1", payDate: "2026-10-14", totalCents: 5000, quantity: 100 },
        ]
        expect(projectDividends([monthly], recorded, months, today).map((e) => e.payDate)[0]).toBe("2026-11-14")
    })

    it("bimestral: só projeta de 2 em 2 meses a partir do último pagamento", () => {
        const bimonthly = { id: "a4", frequency: "bimonthly" as const, quantity: 100 }
        const recorded = [{ assetId: "a4", payDate: "2026-10-10", totalCents: 2000, quantity: 100 }]
        expect(projectDividends([bimonthly], recorded, ["2026-11", "2026-12", "2027-01"], today).map((e) => e.payDate)).toEqual(["2026-12-10"])
    })

    it("trimestral: só projeta de 3 em 3 meses a partir do último pagamento", () => {
        const quarterly = { id: "a2", frequency: "quarterly" as const, quantity: 100 }
        const recorded = [{ assetId: "a2", payDate: "2026-09-20", totalCents: 3000, quantity: 100 }]
        expect(projectDividends([quarterly], recorded, months, today).map((e) => e.payDate)).toEqual(["2026-12-20"])
    })

    it("anual: projeta 12 meses depois e usa o valor por cota fracionado", () => {
        const annual = { id: "a3", frequency: "annual" as const, quantity: 1000 }
        const recorded = [{ assetId: "a3", payDate: "2025-12-05", totalCents: 1234, quantity: 1000, unitCents: 1.234 }]
        const result = projectDividends([annual], recorded, ["2026-12", "2027-01"], today)
        expect(result).toEqual([{ assetId: "a3", payDate: "2026-12-05", totalCents: 1234, quantity: 1000, unitCents: 1.234 }])
    })

    it("sem recorrência, sem histórico ou histórico parado não projeta", () => {
        const recorded = [{ assetId: "a1", payDate: "2026-09-15", totalCents: 5000, quantity: 100 }]
        expect(projectDividends([{ ...monthly, frequency: "none" }], recorded, months, today)).toEqual([])
        expect(projectDividends([monthly], [], months, today)).toEqual([])
        const stale = [{ assetId: "a1", payDate: "2026-01-15", totalCents: 5000, quantity: 100 }]
        expect(projectDividends([monthly], stale, months, today)).toEqual([])
    })

    it("sem provento lançado, usa o valor por cota e a próxima data informados no ativo", () => {
        const asset = { ...monthly, expectedUnitCents: 80, nextDate: "2026-10-20" }
        const result = projectDividends([asset], [], ["2026-10", "2026-11"], today)
        expect(result.map((e) => e.payDate)).toEqual(["2026-10-20", "2026-11-20"])
        expect(result[0]).toMatchObject({ totalCents: 16000, unitCents: 80 })
    })

    it("o valor por cota do ativo vence o do último lançado", () => {
        const recorded = [{ assetId: "a1", payDate: "2026-09-15", totalCents: 5000, quantity: 100 }]
        const asset = { ...monthly, expectedUnitCents: 100 }
        expect(projectDividends([asset], recorded, ["2026-10"], today)[0]?.totalCents).toBe(20000)
    })

    it("faz clamp do dia em meses curtos", () => {
        const recorded = [{ assetId: "a1", payDate: "2026-01-31", totalCents: 1000, quantity: 100 }]
        const result = projectDividends([monthly], recorded, ["2026-02"], "2026-02-01")
        expect(result[0]?.payDate).toBe("2026-02-28")
    })
})
