// Contas de usuário: criação com categorias padrão (usada por cadastro, /setup e admin) e gestão pelo super admin.
import { and, eq, ne, sql } from "drizzle-orm"
import { categories, type User, users } from "../../db/schema"
import { hashPassword } from "../../lib/auth"
import { cached, invalidateAllCache } from "../../lib/cache"
import { type DbOrTx, db } from "../../lib/db"
import { AppError } from "../../lib/errors"
import type { CreateUserInput, UpdateUserInput } from "./schemas/user.schema"

// Cores das escalas emerald/neutral do front.
const DEFAULT_CATEGORIES = [
    { name: "Salário", type: "income", color: "#047857" },
    { name: "Outras receitas", type: "income", color: "#34d399" },
    { name: "Moradia", type: "expense", color: "#065f46" },
    { name: "Mercado", type: "expense", color: "#10b981" },
    { name: "Alimentação", type: "expense", color: "#6ee7b7" },
    { name: "Transporte", type: "expense", color: "#525252" },
    { name: "Saúde", type: "expense", color: "#064e3b" },
    { name: "Educação", type: "expense", color: "#a3a3a3" },
    { name: "Lazer", type: "expense", color: "#34d399" },
    { name: "Assinaturas", type: "expense", color: "#262626" },
    { name: "Contas da casa", type: "expense", color: "#047857" },
    { name: "Outros", type: "expense", color: "#d4d4d4" },
] as const

// Única forma de expor usuário pra fora: passwordHash nunca sai deste módulo nem do auth.service.
export const toPublicUser = (user: User) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarUpdatedAt: user.avatarUpdatedAt,
    createdAt: user.createdAt,
})

export const assertEmailAvailable = async (email: string, executor: DbOrTx = db) => {
    const existing = await executor.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } })
    if (existing) throw new AppError("E-mail já cadastrado", 409)
}

// Precisa rodar dentro de transaction: usuário sem as categorias padrão fica com o app quebrado.
export const createUserAccount = async (
    executor: DbOrTx,
    input: { name: string; email: string; passwordHash: string; role: User["role"] },
) => {
    const [created] = await executor.insert(users).values(input).returning()
    if (!created) throw new AppError("Falha ao criar usuário", 500)
    await executor.insert(categories).values(DEFAULT_CATEGORIES.map((category) => ({ ...category, userId: created.id })))
    return created
}

// Lista global (só super admin): chave "system", invalidada por qualquer escrita na tabela users (invalidateAllCache).
export const listUsers = () =>
    cached("system", "users", "all", async () => {
        const rows = await db.query.users.findMany({ orderBy: (table, { asc }) => [asc(table.createdAt)] })
        return rows.map(toPublicUser)
    })

export const createUser = async (input: CreateUserInput) => {
    await assertEmailAvailable(input.email)
    const passwordHash = await hashPassword(input.password)
    const user = await db.transaction((tx) =>
        createUserAccount(tx, { name: input.name, email: input.email, passwordHash, role: input.role }),
    )
    await invalidateAllCache()
    return toPublicUser(user)
}

const countOtherActiveSuperAdmins = async (userId: string) => {
    const [row] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "super_admin"), eq(users.status, "active"), ne(users.id, userId)))
    return row?.value ?? 0
}

export const updateUser = async (actorId: string, userId: string, input: UpdateUserInput) => {
    const target = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!target) throw new AppError("Usuário não encontrado", 404)

    const losesAdmin =
        target.role === "super_admin" &&
        target.status === "active" &&
        ((input.role !== undefined && input.role !== "super_admin") || input.status === "blocked")

    // Anti-lockout: ninguém tira o próprio acesso de admin, e sempre sobra ao menos um super admin ativo.
    if (userId === actorId && losesAdmin) {
        throw new AppError("Você não pode remover o próprio acesso de super admin", 400)
    }
    if (losesAdmin && (await countOtherActiveSuperAdmins(userId)) === 0) {
        throw new AppError("O sistema precisa de ao menos um super admin ativo", 409)
    }

    const changes: Partial<User> = {}
    if (input.name !== undefined) changes.name = input.name
    if (input.role !== undefined) changes.role = input.role
    if (input.status !== undefined) changes.status = input.status
    if (input.password !== undefined) {
        changes.passwordHash = await hashPassword(input.password)
        changes.passwordChangedAt = new Date() // reset pelo admin também derruba as sessões abertas do usuário
    }

    const [updated] = await db.update(users).set(changes).where(eq(users.id, userId)).returning()
    await invalidateAllCache() // afeta /auth/me e /profile do alvo, além da lista
    return toPublicUser(updated!)
}
