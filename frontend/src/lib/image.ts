// Prepara a foto de perfil no navegador (recorte quadrado + redução) antes de enviar; o servidor revalida de qualquer jeito.
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp"
const MAX_INPUT_BYTES = 10 * 1024 * 1024
const OUTPUT_SIZE = 512

const readBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
        reader.onerror = () => reject(new Error("Não foi possível ler a imagem"))
        reader.readAsDataURL(blob)
    })

// Lança Error com mensagem pronta pro usuário (não é erro de API, então não passa pelo apiError).
export const fileToAvatarBase64 = async (file: File) => {
    if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem")
    if (file.size > MAX_INPUT_BYTES) throw new Error("A imagem passa de 10 MB")

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
        throw new Error("Não foi possível ler essa imagem")
    })

    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Seu navegador não suporta editar imagens")

    // Recorte quadrado centralizado (o mesmo "cover" que o servidor aplica).
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9))
    if (!blob) throw new Error("Não foi possível preparar a imagem")
    return readBase64(blob)
}
