// Integração leve: sobe o app via inject (sem tocar no banco) e garante que toda rota privada exige token.
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../../server"

const protectedEndpoints = [
    ["GET", "/auth/me"],
    ["POST", "/auth/logout"],
    ["GET", "/accounts"],
    ["POST", "/accounts"],
    ["GET", "/assets"],
    ["POST", "/assets"],
    ["PATCH", "/assets/x"],
    ["DELETE", "/assets/x"],
    ["GET", "/asset-trades"],
    ["POST", "/asset-trades"],
    ["DELETE", "/asset-trades/x"],
    ["GET", "/dividends"],
    ["GET", "/dividends/upcoming"],
    ["POST", "/dividends"],
    ["PATCH", "/dividends/x"],
    ["DELETE", "/dividends/x"],
    ["GET", "/categories"],
    ["GET", "/credit-cards"],
    ["GET", "/invoices"],
    ["POST", "/invoices/abc/pay"],
    ["GET", "/transactions"],
    ["POST", "/transactions"],
    ["DELETE", "/transactions/abc"],
    ["GET", "/recurring-transactions"],
    ["GET", "/notifications"],
    ["GET", "/reports/summary"],
    ["GET", "/reports/upcoming"],
    ["GET", "/users"],
    ["POST", "/users"],
    ["PATCH", "/users/abc"],
    ["GET", "/profile"],
    ["PATCH", "/profile"],
    ["POST", "/profile/avatar"],
    ["GET", "/profile/avatar"],
    ["DELETE", "/profile/avatar"],
] as const

describe("rotas protegidas", () => {
    let app: FastifyInstance

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()
    })

    afterAll(() => app.close())

    for (const [method, url] of protectedEndpoints) {
        it(`${method} ${url} sem token -> 401`, async () => {
            const response = await app.inject({ method, url })
            expect(response.statusCode).toBe(401)
            expect(response.json()).toMatchObject({ success: false })
        })
    }

    it("token inválido -> 401", async () => {
        const response = await app.inject({ method: "GET", url: "/accounts", headers: { authorization: "Bearer x" } })
        expect(response.statusCode).toBe(401)
    })

    it("GET /health -> 200", async () => {
        const response = await app.inject({ method: "GET", url: "/health" })
        expect(response.json<{ status: string }>().status).toBe("ok")
    })

    it("body inválido no cadastro -> 400 com errors", async () => {
        const response = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "x" } })
        expect(response.statusCode).toBe(400)
        expect(response.json().errors.length).toBeGreaterThan(0)
    })

    it("OpenAPI gera sem erro", async () => {
        const response = await app.inject({ method: "GET", url: "/docs/openapi.json" })
        expect(response.statusCode).toBe(200)
        expect(Object.keys(response.json().paths).length).toBeGreaterThan(10)
    })
})
