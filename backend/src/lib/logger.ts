// Logger pino compartilhado entre Fastify e jobs; log estruturado por `event`.
import pino from "pino"
import { env } from "../env"

export const loggerOptions: pino.LoggerOptions = {
    enabled: env.LOG_ENABLED,
    level: env.LOG_LEVEL,
    redact: [
        "req.headers.authorization",
        "*.password",
        "*.passwordHash",
        "*.currentPassword",
        "*.newPassword",
        "*.image", // foto em base64 (até ~4 MB): não pode ir parar no log
    ],
    ...(env.NODE_ENV === "development" ? { transport: { target: "pino-pretty", options: { colorize: true } } } : {}),
}

export const logger = pino(loggerOptions)
