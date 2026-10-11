// Testes da regra que invalida tokens emitidos antes da última troca de senha.
import { describe, expect, it } from "bun:test"
import { isTokenStale } from "../token-staleness"

const changedAt = new Date("2026-10-10T12:00:00.500Z")
const changedAtSeconds = Math.floor(changedAt.getTime() / 1000)

describe("isTokenStale", () => {
    it("sem passwordChangedAt o token é válido", () => {
        expect(isTokenStale(1, null)).toBe(false)
        expect(isTokenStale(1, undefined)).toBe(false)
    })

    it("token emitido antes da troca de senha é inválido", () => {
        expect(isTokenStale(changedAtSeconds - 1, changedAt)).toBe(true)
        expect(isTokenStale(0, changedAt)).toBe(true)
    })

    it("token emitido no mesmo segundo da troca é válido (token novo logo após a troca)", () => {
        expect(isTokenStale(changedAtSeconds, changedAt)).toBe(false)
    })

    it("token emitido depois da troca é válido", () => {
        expect(isTokenStale(changedAtSeconds + 1, changedAt)).toBe(false)
        expect(isTokenStale(changedAtSeconds + 3600, changedAt)).toBe(false)
    })

    it("trunca os milissegundos da troca (iat é em segundos)", () => {
        const almostNextSecond = new Date("2026-10-10T12:00:00.999Z")
        expect(isTokenStale(changedAtSeconds, almostNextSecond)).toBe(false)
        expect(isTokenStale(changedAtSeconds - 1, almostNextSecond)).toBe(true)
    })
})
