// Singleton do Drizzle sobre postgres.js (mesmo driver que o drizzle-kit usa na CLI).
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../db/schema"
import { env } from "../env"

export const sql = postgres(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX, onnotice: () => {} })

export const db = drizzle(sql, { schema })

export type Db = typeof db
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
// Funções que rodam tanto dentro quanto fora de transaction recebem este tipo.
export type DbOrTx = Db | Tx
