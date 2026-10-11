// Testes do processamento da foto de perfil: formatos aceitos, limites e remoção de metadata.
import { describe, expect, it } from "bun:test"
import sharp from "sharp"
import { AppError } from "../../../lib/errors"
import { AVATAR_OUTPUT_SIZE, MAX_AVATAR_BYTES, processAvatarImage } from "../avatar-image"

const background = { r: 200, g: 30, b: 30 }
const baseImage = (width = 400, height = 300) => sharp({ create: { width, height, channels: 3, background } })

const expectRejected = async (input: Buffer, message?: string) => {
    const error = await processAvatarImage(input).then(
        () => null,
        (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).statusCode).toBe(400)
    if (message) expect((error as AppError).message).toBe(message)
}

describe("processAvatarImage: formatos aceitos", () => {
    const cases = [
        ["png", () => baseImage().png().toBuffer()],
        ["jpeg", () => baseImage().jpeg().toBuffer()],
        ["webp", () => baseImage().webp().toBuffer()],
    ] as const

    for (const [format, build] of cases) {
        it(`aceita ${format} e devolve webp ${AVATAR_OUTPUT_SIZE}x${AVATAR_OUTPUT_SIZE}`, async () => {
            const output = await processAvatarImage(await build())
            const metadata = await sharp(output).metadata()
            expect(metadata.format).toBe("webp")
            expect(metadata.width).toBe(AVATAR_OUTPUT_SIZE)
            expect(metadata.height).toBe(AVATAR_OUTPUT_SIZE)
        })
    }

    it("imagem pequena também sai quadrada em 256x256", async () => {
        const output = await processAvatarImage(await baseImage(32, 64).png().toBuffer())
        const metadata = await sharp(output).metadata()
        expect(metadata.width).toBe(AVATAR_OUTPUT_SIZE)
        expect(metadata.height).toBe(AVATAR_OUTPUT_SIZE)
    })
})

describe("processAvatarImage: entradas recusadas", () => {
    it("recusa gif", async () => {
        const gif = await baseImage().gif().toBuffer()
        await expectRejected(gif, "Use uma imagem JPEG, PNG ou WebP")
    })

    it("recusa texto", async () => {
        await expectRejected(Buffer.from("isto não é uma imagem, é só texto"))
    })

    it("recusa bytes aleatórios", async () => {
        const bytes = Buffer.alloc(2048)
        for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 131 + 17) % 256
        await expectRejected(bytes)
    })

    it("recusa imagem truncada/corrompida", async () => {
        const png = await baseImage().png().toBuffer()
        await expectRejected(png.subarray(0, Math.floor(png.length / 2)))
    })

    it("recusa buffer vazio", async () => {
        await expectRejected(Buffer.alloc(0), "Imagem vazia")
    })

    it("recusa arquivo acima de 3 MB", async () => {
        await expectRejected(Buffer.alloc(MAX_AVATAR_BYTES + 1), "Imagem muito grande (máximo 3 MB)")
    })

    it("recusa dimensão acima de 4096 px", async () => {
        const wide = await sharp({ create: { width: 4097, height: 1, channels: 3, background } })
            .png()
            .toBuffer()
        await expectRejected(wide)
        const tall = await sharp({ create: { width: 1, height: 4097, channels: 3, background } })
            .png()
            .toBuffer()
        await expectRejected(tall)
    })
})

describe("processAvatarImage: metadata", () => {
    it("remove EXIF/metadata da saída", async () => {
        const withExif = await baseImage()
            .jpeg()
            .withMetadata({ exif: { IFD0: { Copyright: "segredo", Artist: "fulano" } } })
            .toBuffer()
        expect((await sharp(withExif).metadata()).exif).toBeDefined()

        const output = await processAvatarImage(withExif)
        const metadata = await sharp(output).metadata()
        expect(metadata.exif).toBeUndefined()
        expect(metadata.icc).toBeUndefined()
        expect(output.includes(Buffer.from("segredo"))).toBe(false)
    })

    it("descarta payload anexado depois do fim da imagem (polyglot)", async () => {
        const png = await baseImage().png().toBuffer()
        const polyglot = Buffer.concat([png, Buffer.from("<script>alert(1)</script>")])
        const output = await processAvatarImage(polyglot)
        expect(output.includes(Buffer.from("<script>"))).toBe(false)
        expect((await sharp(output).metadata()).format).toBe("webp")
    })

    it("aplica a orientação do EXIF antes de descartá-la", async () => {
        const rotated = await sharp({ create: { width: 400, height: 100, channels: 3, background } })
            .jpeg()
            .withMetadata({ orientation: 6 })
            .toBuffer()
        const output = await processAvatarImage(rotated)
        const metadata = await sharp(output).metadata()
        expect(metadata.width).toBe(AVATAR_OUTPUT_SIZE)
        expect(metadata.height).toBe(AVATAR_OUTPUT_SIZE)
        expect(metadata.orientation).toBeUndefined()
    })
})
