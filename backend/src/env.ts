// Validação das variáveis de ambiente: falha no boot se faltar algo, em vez de quebrar em runtime.
import { z } from "zod"

const booleanFromString = z
    .enum(["true", "false", "1", "0"])
    .transform((value) => value === "true" || value === "1")

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3333),
    HOST: z.string().default("0.0.0.0"),
    LOG_ENABLED: booleanFromString.default(true),
    // Nº de proxies confiáveis na frente da API (0 = nenhum). Cloudflare + Nginx Proxy Manager = 2: req.ip vira o IP real do cliente
    // (rate limit por IP) e um X-Forwarded-For forjado pelo cliente não vale.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    DATABASE_URL: z.url(),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET precisa ter ao menos 32 caracteres")
        .refine((value) => value !== "change-me", "JWT_SECRET ainda está com o placeholder"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    // Token de uso único pra criar o primeiro super admin em POST /setup. Sem default de propósito.
    SETUP_TOKEN: z
        .string()
        .min(24, "SETUP_TOKEN precisa ter ao menos 24 caracteres")
        .refine((value) => value !== "change-me", "SETUP_TOKEN ainda está com o placeholder"),
    // false: só o super admin cria contas (em /users). Cadastro público fica fechado até o /setup de qualquer jeito.
    ALLOW_PUBLIC_SIGNUP: booleanFromString.default(true),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
    JOBS_ENABLED: booleanFromString.default(true),
    JOBS_RUN_ON_BOOT: booleanFromString.default(true),
    RECURRING_LEAD_DAYS: z.coerce.number().int().min(0).max(60).default(5),
    REMINDER_DAYS_BEFORE: z.coerce.number().int().min(0).max(30).default(3),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    console.error("Variáveis de ambiente inválidas:")
    for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join(".")}: ${issue.message}`)
    process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
