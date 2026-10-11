// Schemas de resposta de contas (saldo calculado em balanceCents).
import { z } from "zod"
import { accountTypeValues } from "../../../db/schema"

export const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(accountTypeValues),
    initialBalanceCents: z.number().int(),
    balanceCents: z.number().int(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

const envelope = { success: z.literal(true), message: z.string() }

export const CreateAccountResponse = z.object({ ...envelope, account: AccountSchema })
export const GetAccountResponse = CreateAccountResponse
export const UpdateAccountResponse = CreateAccountResponse
export const ListAccountsResponse = z.object({ ...envelope, accounts: z.array(AccountSchema) })
