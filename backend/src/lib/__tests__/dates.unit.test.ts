// Testes dos helpers de data "YYYY-MM-DD".
import { describe, expect, it } from "bun:test"
import { addDays, addMonths, daysInMonth, monthRange, todayIn } from "../dates"

describe("dates", () => {
    it("daysInMonth considera ano bissexto", () => {
        expect(daysInMonth(2028, 2)).toBe(29)
        expect(daysInMonth(2027, 2)).toBe(28)
    })

    it("addMonths faz clamp no fim do mês e aceita meses negativos", () => {
        expect(addMonths("2026-01-31", 1)).toBe("2026-02-28")
        expect(addMonths("2026-03-15", -3)).toBe("2025-12-15")
    })

    it("addDays atravessa o ano", () => {
        expect(addDays("2026-12-30", 3)).toBe("2027-01-02")
    })

    it("monthRange devolve primeiro e último dia", () => {
        expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" })
    })

    it("todayIn respeita o fuso", () => {
        const instant = new Date("2026-10-11T01:30:00Z")
        expect(todayIn("America/Sao_Paulo", instant)).toBe("2026-10-10")
        expect(todayIn("UTC", instant)).toBe("2026-10-11")
    })
})
