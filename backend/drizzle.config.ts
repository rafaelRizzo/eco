// Configuração do drizzle-kit: gera migrations a partir de src/db/schema e aplica no DATABASE_URL.
import { defineConfig } from "drizzle-kit"

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL não definida (copie .env.example para .env)")

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema/index.ts",
    out: "./drizzle",
    dbCredentials: { url },
    strict: true,
    verbose: true,
})
