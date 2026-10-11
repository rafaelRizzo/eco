// Enums Postgres compartilhados entre tabelas; os arrays `*Values` alimentam também os schemas Zod.
import { pgEnum } from "drizzle-orm/pg-core"

export const accountTypeValues = ["checking", "savings", "cash", "investment", "other"] as const
export const accountType = pgEnum("account_type", accountTypeValues)

// Tipo do lançamento: receita ou despesa (categoria segue o mesmo tipo).
export const transactionTypeValues = ["income", "expense"] as const
export const transactionType = pgEnum("transaction_type", transactionTypeValues)

export const transactionStatusValues = ["pending", "paid", "overdue"] as const
export const transactionStatus = pgEnum("transaction_status", transactionStatusValues)

export const recurrenceFrequencyValues = ["weekly", "monthly", "yearly"] as const
export const recurrenceFrequency = pgEnum("recurrence_frequency", recurrenceFrequencyValues)

export const invoiceStatusValues = ["open", "closed", "paid", "overdue"] as const
export const invoiceStatus = pgEnum("invoice_status", invoiceStatusValues)

export const notificationTypeValues = [
    "bill_due",
    "bill_overdue",
    "invoice_closed",
    "invoice_due",
    "invoice_overdue",
] as const
export const notificationType = pgEnum("notification_type", notificationTypeValues)

export const jobRunStatusValues = ["running", "success", "failed"] as const
export const jobRunStatus = pgEnum("job_run_status", jobRunStatusValues)

// super_admin: criado no bootstrap (/setup), gerencia usuários. user: dono só dos próprios dados.
export const userRoleValues = ["super_admin", "user"] as const
export const userRole = pgEnum("user_role", userRoleValues)

// blocked: login e qualquer request autenticada recusados (checado no banco a cada request).
export const userStatusValues = ["active", "blocked"] as const
export const userStatus = pgEnum("user_status", userStatusValues)

// Classe do ativo de investimento; `reit` (FII) é a única que a projeção de proventos assume mensal.
export const assetClassValues = ["stock", "reit", "crypto", "currency", "other"] as const
export const assetClass = pgEnum("asset_class", assetClassValues)

export const tradeTypeValues = ["buy", "sell"] as const
export const tradeType = pgEnum("trade_type", tradeTypeValues)

export const dividendKindValues = ["dividend", "jcp", "yield", "other"] as const
export const dividendKind = pgEnum("dividend_kind", dividendKindValues)

// Cadência de pagamento de proventos do ativo; `none` = sem recorrência (só aparece o que for lançado).
export const dividendFrequencyValues = ["none", "monthly", "bimonthly", "quarterly", "semiannual", "annual"] as const
export const dividendFrequency = pgEnum("dividend_frequency", dividendFrequencyValues)
