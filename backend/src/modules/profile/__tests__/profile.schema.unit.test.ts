// Testes dos schemas de entrada do perfil: atualização de dados e upload de foto em base64.
import { describe, expect, it } from "bun:test"
import { updateProfileSchema, uploadAvatarSchema } from "../schemas/profile.schema"

describe("updateProfileSchema", () => {
    it("recusa objeto vazio", () => {
        const result = updateProfileSchema.safeParse({})
        expect(result.success).toBe(false)
        expect(result.error?.issues[0]?.message).toBe("Informe ao menos um campo")
    })

    it("aceita só o nome", () => {
        const result = updateProfileSchema.safeParse({ name: "  Maria Souza  " })
        expect(result.success).toBe(true)
        expect(result.data).toEqual({ name: "Maria Souza" })
    })

    it("recusa nome curto demais", () => {
        expect(updateProfileSchema.safeParse({ name: "A" }).success).toBe(false)
    })

    it("recusa newPassword com menos de 8 caracteres", () => {
        const result = updateProfileSchema.safeParse({ newPassword: "1234567", currentPassword: "antiga123" })
        expect(result.success).toBe(false)
        expect(result.error?.issues[0]?.path).toEqual(["newPassword"])
    })

    it("aceita newPassword com 8 caracteres", () => {
        const result = updateProfileSchema.safeParse({ newPassword: "12345678", currentPassword: "antiga123" })
        expect(result.success).toBe(true)
        expect(result.data?.newPassword).toBe("12345678")
    })

    it("normaliza o e-mail pra minúsculo e sem espaços", () => {
        const result = updateProfileSchema.safeParse({ email: "  Maria@Exemplo.COM ", currentPassword: "x" })
        expect(result.success).toBe(true)
        expect(result.data?.email).toBe("maria@exemplo.com")
    })

    it("recusa e-mail inválido", () => {
        expect(updateProfileSchema.safeParse({ email: "nao-e-email" }).success).toBe(false)
    })

    it("recusa currentPassword vazia", () => {
        expect(updateProfileSchema.safeParse({ name: "Maria", currentPassword: "" }).success).toBe(false)
    })

    it("campos role/status/id/passwordChangedAt não vazam no resultado", () => {
        const result = updateProfileSchema.safeParse({
            name: "Maria",
            role: "super_admin",
            status: "active",
            id: "outro-usuario",
            passwordChangedAt: "2020-01-01",
        })
        expect(result.success).toBe(true)
        expect(result.data).toEqual({ name: "Maria" })
        expect(result.data).not.toHaveProperty("role")
        expect(result.data).not.toHaveProperty("status")
        expect(result.data).not.toHaveProperty("id")
        expect(result.data).not.toHaveProperty("passwordChangedAt")
    })

    it("só campos desconhecidos conta como vazio", () => {
        expect(updateProfileSchema.safeParse({ role: "super_admin" }).success).toBe(false)
    })
})

describe("uploadAvatarSchema", () => {
    it("aceita base64 válido", () => {
        const image = Buffer.from("conteudo qualquer").toString("base64")
        const result = uploadAvatarSchema.safeParse({ image })
        expect(result.success).toBe(true)
        expect(result.data).toEqual({ image })
    })

    it("recusa string vazia", () => {
        const result = uploadAvatarSchema.safeParse({ image: "" })
        expect(result.success).toBe(false)
        expect(result.error?.issues[0]?.message).toBe("Envie uma imagem")
    })

    it("recusa campo ausente", () => {
        expect(uploadAvatarSchema.safeParse({}).success).toBe(false)
    })

    it("recusa base64 inválido", () => {
        expect(uploadAvatarSchema.safeParse({ image: "não é base64!!" }).success).toBe(false)
        expect(uploadAvatarSchema.safeParse({ image: "abc$def" }).success).toBe(false)
        expect(uploadAvatarSchema.safeParse({ image: "abc===" }).success).toBe(false)
    })

    it("recusa prefixo data URL (esperado base64 puro)", () => {
        expect(uploadAvatarSchema.safeParse({ image: "data:image/png;base64,AAAA" }).success).toBe(false)
    })

    it("recusa acima do limite de 4.200.000 caracteres", () => {
        const result = uploadAvatarSchema.safeParse({ image: "A".repeat(4_200_001) })
        expect(result.success).toBe(false)
        expect(result.error?.issues[0]?.message).toBe("Imagem muito grande")
    })

    it("aceita exatamente no limite", () => {
        expect(uploadAvatarSchema.safeParse({ image: "A".repeat(4_200_000) }).success).toBe(true)
    })
})
