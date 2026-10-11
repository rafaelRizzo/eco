// Erro de domínio único + handler central que traduz qualquer erro pro envelope { success: false, message }.
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify"
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from "fastify-type-provider-zod"
import { ZodError } from "zod"

export class AppError extends Error {
    constructor(
        message: string,
        public statusCode = 400,
    ) {
        super(message)
        this.name = "AppError"
    }
}

type ErrorIssue = { path: string; message: string }

const zodIssues = (error: ZodError): ErrorIssue[] =>
    error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))

// Código de violação do Postgres (postgres.js expõe `code` no erro).
const pgCode = (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : null

export const handleError = (reply: FastifyReply, error: unknown, req?: FastifyRequest) => {
    reply.header("x-request-id", reply.request.id)

    if (error instanceof ZodError) {
        return reply.status(400).send({ success: false, message: "Dados inválidos", errors: zodIssues(error) })
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
        const errors = error.validation.map((issue) => ({
            path: issue.instancePath.replace(/^\//, "").replaceAll("/", "."),
            message: issue.message ?? "Valor inválido",
        }))
        return reply.status(400).send({ success: false, message: "Dados inválidos", errors })
    }

    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ success: false, message: error.message })
    }

    const code = pgCode(error)
    if (code === "23505") return reply.status(409).send({ success: false, message: "Registro já existe" })
    if (code === "23503") {
        return reply.status(409).send({ success: false, message: "Registro está em uso ou referência inválida" })
    }

    const fastifyError = error as FastifyError
    if (fastifyError?.statusCode && fastifyError.statusCode < 500) {
        return reply.status(fastifyError.statusCode).send({ success: false, message: fastifyError.message })
    }

    const log = req?.log ?? reply.log
    if (isResponseSerializationError(error)) {
        log.error({ event: "response_serialization_failed", issues: error.cause.issues, url: error.url })
    } else {
        log.error({ event: "unhandled_error", err: error })
    }
    return reply.status(500).send({ success: false, message: "Erro interno do servidor" })
}
