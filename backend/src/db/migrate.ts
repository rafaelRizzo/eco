// Aplica as migrations de drizzle/ com log detalhado (o `drizzle-kit migrate` engole o erro do Postgres).
// Uso: `bun run db:migrate`, lê só DATABASE_URL do .env, mostra pendentes, progresso e o erro completo se falhar.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const MIGRATIONS_FOLDER = join(import.meta.dir, "../../drizzle")

type JournalEntry = { idx: number; when: number; tag: string }

const url = process.env.DATABASE_URL
if (!url) {
    console.error("✖ DATABASE_URL não definida (copie .env.example para .env)")
    process.exit(1)
}

// Nunca imprime a senha.
const maskUrl = (raw: string) => {
    try {
        const parsed = new URL(raw)
        if (parsed.password) parsed.password = "***"
        return parsed.toString()
    } catch {
        return "(DATABASE_URL inválida)"
    }
}

// Mostra todos os campos úteis do erro do Postgres, descendo pela cadeia de `cause` (DrizzleQueryError embrulha o original).
const printError = (error: unknown) => {
    let current: unknown = error
    let depth = 0
    while (current && depth < 5) {
        const err = current as Record<string, unknown> & Error
        const prefix = depth === 0 ? "✖" : "  ↳ causa:"
        console.error(`${prefix} ${err.name ?? "Error"}: ${err.message ?? String(current)}`)
        for (const field of ["code", "severity", "detail", "hint", "where", "position", "schema_name", "table_name", "column_name", "constraint_name", "routine"]) {
            if (err[field] !== undefined && err[field] !== "") console.error(`    ${field}: ${err[field]}`)
        }
        if (typeof err.query === "string") console.error(`    query: ${err.query.trim().slice(0, 2000)}`)
        current = err.cause
        depth++
    }
}

const journal = JSON.parse(readFileSync(join(MIGRATIONS_FOLDER, "meta/_journal.json"), "utf8")) as { entries: JournalEntry[] }

const client = postgres(url, {
    max: 1,
    connect_timeout: 10,
    onnotice: (notice) => console.log(`  · notice: ${notice.message}`),
})

const startedAt = performance.now()
let exitCode = 0

try {
    console.log(`→ Banco: ${maskUrl(url)}`)
    const [info] = await client`select current_database() as db, current_user as "user", version() as version`
    console.log(`✔ Conectado em "${info?.db}" como "${info?.user}" (${String(info?.version).split(" ").slice(0, 2).join(" ")})`)

    // Mesmo critério do migrator do drizzle: aplica o que tiver `when` maior que o último `created_at` registrado.
    const [table] = await client`select to_regclass('drizzle.__drizzle_migrations') as name`
    const applied = table?.name
        ? await client`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`
        : []
    const lastAppliedAt = applied[0] ? Number(applied[0].created_at) : 0
    const pending = journal.entries.filter((entry) => entry.when > lastAppliedAt)

    console.log(`→ Migrations: ${journal.entries.length} no total, ${journal.entries.length - pending.length} já aplicada(s), ${pending.length} pendente(s)`)
    if (pending.length === 0) {
        console.log("✔ Nada pra aplicar, banco já está atualizado.")
    } else {
        for (const entry of pending) console.log(`  · ${entry.tag}`)
        console.log("→ Aplicando (tudo numa transaction: se uma falhar, nenhuma fica aplicada)...")
        await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER })
        const seconds = ((performance.now() - startedAt) / 1000).toFixed(2)
        console.log(`✔ ${pending.length} migration(s) aplicada(s) em ${seconds}s`)
    }
} catch (error) {
    console.error("\nFalha ao aplicar migrations:")
    printError(error)
    exitCode = 1
} finally {
    await client.end({ timeout: 5 })
}

process.exit(exitCode)
