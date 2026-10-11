// Testes das regras puras de cobrança: ciclo de fatura, parcelas e próxima ocorrência.
import { describe, expect, it } from "bun:test"
import { nextOccurrence, resolveInvoiceCycle, splitInstallments } from "../billing"

describe("resolveInvoiceCycle", () => {
    it("compra antes do fechamento cai na fatura do mês", () => {
        expect(resolveInvoiceCycle("2026-10-05", 10, 20)).toEqual({
            referenceMonth: "2026-10",
            closingDate: "2026-10-10",
            dueDate: "2026-10-20",
        })
    })

    it("compra no dia do fechamento já vai pra fatura seguinte", () => {
        expect(resolveInvoiceCycle("2026-10-10", 10, 20)).toEqual({
            referenceMonth: "2026-11",
            closingDate: "2026-11-10",
            dueDate: "2026-11-20",
        })
    })

    it("vencimento antes do fechamento vence no mês seguinte ao fechamento", () => {
        expect(resolveInvoiceCycle("2026-10-20", 25, 5)).toEqual({
            referenceMonth: "2026-11",
            closingDate: "2026-10-25",
            dueDate: "2026-11-05",
        })
    })

    it("vira o ano", () => {
        expect(resolveInvoiceCycle("2026-12-28", 25, 5)).toEqual({
            referenceMonth: "2027-02",
            closingDate: "2027-01-25",
            dueDate: "2027-02-05",
        })
    })

    it("fechamento dia 31 em fevereiro usa o último dia do mês", () => {
        expect(resolveInvoiceCycle("2027-02-10", 31, 10)).toEqual({
            referenceMonth: "2027-03",
            closingDate: "2027-02-28",
            dueDate: "2027-03-10",
        })
    })

    it("compra no último dia de fevereiro com fechamento 31 vai pra março", () => {
        expect(resolveInvoiceCycle("2027-02-28", 31, 10).closingDate).toBe("2027-03-31")
    })
})

describe("splitInstallments", () => {
    it("divide igualmente quando é exato", () => {
        expect(splitInstallments(30000, 3)).toEqual([10000, 10000, 10000])
    })

    it("joga o resto dos centavos na primeira parcela", () => {
        const parts = splitInstallments(10000, 3)
        expect(parts).toEqual([3334, 3333, 3333])
        expect(parts.reduce((sum, value) => sum + value, 0)).toBe(10000)
    })

    it("uma parcela devolve o total", () => {
        expect(splitInstallments(1999, 1)).toEqual([1999])
    })
})

describe("nextOccurrence", () => {
    it("mensal mantém o dia âncora depois de fevereiro", () => {
        const feb = nextOccurrence("2027-01-31", "monthly", 31)
        expect(feb).toBe("2027-02-28")
        expect(nextOccurrence(feb, "monthly", 31)).toBe("2027-03-31")
    })

    it("semanal soma 7 dias atravessando o mês", () => {
        expect(nextOccurrence("2026-10-28", "weekly", 28)).toBe("2026-11-04")
    })

    it("anual em 29/02 cai em 28/02 no ano não bissexto", () => {
        expect(nextOccurrence("2028-02-29", "yearly", 29)).toBe("2029-02-28")
    })
})
