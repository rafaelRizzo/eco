// Assinatura/verificação de JWT (HS256 fixo) e hash de senha com argon2.
import { createHash, timingSafeEqual } from "node:crypto"
import argon2 from "argon2"
import { createId } from "@paralleldrive/cuid2"
import jwt from "jsonwebtoken"
import { env } from "../env"

// jti identifica o token (permite revogar no logout); tokens emitidos antes dessa mudança não têm.
export type TokenPayload = { sub: string; iat: number; exp: number; jti?: string }

export const signAccessToken = (userId: string) =>
    jwt.sign({}, env.JWT_SECRET, {
        algorithm: "HS256",
        subject: userId,
        jwtid: createId(),
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    })

export const verifyAccessToken = (token: string): TokenPayload | null => {
    try {
        const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] })
        if (typeof payload === "string" || !payload.sub) return null
        return { sub: payload.sub, iat: payload.iat ?? 0, exp: payload.exp ?? 0, jti: payload.jti }
    } catch {
        return null
    }
}

export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id })

export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password).catch(() => false)

// Comparação em tempo constante (hash antes pra igualar o tamanho): `===` vaza pelo tempo quantos chars batem.
export const timingSafeEqualStrings = (a: string, b: string) => {
    const hashA = createHash("sha256").update(a).digest()
    const hashB = createHash("sha256").update(b).digest()
    return timingSafeEqual(hashA, hashB)
}
