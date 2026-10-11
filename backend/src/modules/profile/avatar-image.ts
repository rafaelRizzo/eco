// Valida e reencoda a foto de perfil: o servidor nunca guarda os bytes enviados, só o resultado do sharp.
import sharp from "sharp"
import { AppError } from "../../lib/errors"

export const AVATAR_OUTPUT_SIZE = 256
// Limite do arquivo decodificado (o front já reduz antes de enviar; isto é só a trava do servidor).
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024
const MAX_DIMENSION = 4096
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"])

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// JPEG (FF D8 FF), PNG (assinatura de 8 bytes) ou WebP (RIFF....WEBP).
const hasAllowedSignature = (input: Buffer) =>
    (input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) ||
    input.subarray(0, 8).equals(PNG_SIGNATURE) ||
    (input.length > 12 && input.toString("ascii", 0, 4) === "RIFF" && input.toString("ascii", 8, 12) === "WEBP")

// O tipo declarado pelo cliente é forjável: quem decide o formato é o sharp lendo os bytes reais (um .gif renomeado
// pra .png cai aqui como "gif" e é recusado). Reencodar a partir dos pixels descarta EXIF (GPS etc.), comentários
// e qualquer payload anexado depois do fim da imagem (polyglot). `limitInputPixels` barra decompression bomb.
export const processAvatarImage = async (input: Buffer) => {
    if (input.length === 0) throw new AppError("Imagem vazia", 400)
    if (input.length > MAX_AVATAR_BYTES) throw new AppError("Imagem muito grande (máximo 3 MB)", 400)

    // Assinatura dos bytes antes do sharp: ele tem loaders pra TIFF/HEIF/SVG/GIF, que o endpoint não aceita; assim o
    // formato errado nem chega nos decoders.
    if (!hasAllowedSignature(input)) throw new AppError("Use uma imagem JPEG, PNG ou WebP", 400)

    const options = { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION, failOn: "error" } as const

    try {
        const metadata = await sharp(input, options).metadata()
        if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
            throw new AppError("Use uma imagem JPEG, PNG ou WebP", 400)
        }
        if (!metadata.width || !metadata.height || metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
            throw new AppError("Dimensões da imagem inválidas (máximo 4096 px)", 400)
        }

        return await sharp(input, options)
            .rotate() // aplica a orientação do EXIF antes de ele ser descartado
            .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, { fit: "cover" })
            .webp({ quality: 85 })
            .toBuffer()
    } catch (error) {
        if (error instanceof AppError) throw error
        throw new AppError("Arquivo de imagem corrompido ou inválido", 400)
    }
}
