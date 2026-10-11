// Registro dos jobs, na ordem em que devem rodar quando executados em sequência (boot/CLI):
// gerar recorrências -> fechar faturas -> marcar atrasos -> lembrar vencimentos.
import { billsJob } from "./bills.job"
import { invoicesJob } from "./invoices.job"
import type { JobDefinition } from "./job-runner"
import { recurringTransactionsJob } from "./recurring-transactions.job"
import { remindersJob } from "./reminders.job"

export const jobs: JobDefinition[] = [recurringTransactionsJob, invoicesJob, billsJob, remindersJob]

export const findJob = (name: string) => jobs.find((job) => job.name === name)
