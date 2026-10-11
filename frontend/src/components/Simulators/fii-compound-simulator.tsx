// Simulador de juros compostos para FIIs: aporte inicial e mensal, taxa, reinvestimento dos proventos e prazo em anos.
import { useMemo, useState } from "react"
import { AnimatedMoney } from "@/components/animated-money"
import { MoneyInput } from "@/components/money-input"
import { OptionSelect } from "@/components/option-select"
import { Money } from "@/components/money"
import { GrowthChart } from "@/components/Simulators/growth-chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type RatePeriod, simulateCompoundInterest } from "@/lib/compound-interest"

const MAX_YEARS = 50

const PERIOD_OPTIONS = [
    { value: "monthly", label: "ao mês" },
    { value: "yearly", label: "ao ano" },
]

// Aceita "0,85" ou "0.85"; vazio ou inválido vira 0.
const parseDecimal = (text: string) => {
    const value = Number(text.replace(",", "."))
    return Number.isFinite(value) && value >= 0 ? value : 0
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const formatPercent = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`

export function FiiCompoundSimulator() {
    const [initialCents, setInitialCents] = useState(0)
    const [monthlyCents, setMonthlyCents] = useState(100_000)
    const [rate, setRate] = useState("0,8")
    const [ratePeriod, setRatePeriod] = useState<RatePeriod>("monthly")
    const [reinvest, setReinvest] = useState("100")
    const [yearsText, setYearsText] = useState("10")

    const ratePercent = parseDecimal(rate)
    const reinvestPercent = clamp(parseDecimal(reinvest), 0, 100)
    const years = clamp(Math.floor(parseDecimal(yearsText)), 0, MAX_YEARS)

    const result = useMemo(
        () => simulateCompoundInterest({ initialCents, monthlyCents, ratePercent, ratePeriod, reinvestPercent, years }),
        [initialCents, monthlyCents, ratePercent, ratePeriod, reinvestPercent, years],
    )

    const gainCents = Math.max(result.balanceCents - result.investedCents, 0)

    return (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
            <section className="h-fit space-y-4 rounded-2xl border bg-card p-4">
                <h2 className="font-heading font-medium text-sm">Parâmetros</h2>
                <div className="space-y-1.5">
                    <Label htmlFor="sim-initial">Aporte inicial</Label>
                    <MoneyInput id="sim-initial" value={initialCents} onChange={setInitialCents} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="sim-monthly">Aporte mensal</Label>
                    <MoneyInput id="sim-monthly" value={monthlyCents} onChange={setMonthlyCents} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="sim-rate">Taxa de juros (yield dos proventos)</Label>
                    <div className="grid grid-cols-[1fr_8rem] gap-2">
                        <Input
                            id="sim-rate"
                            inputMode="decimal"
                            autoComplete="off"
                            className="money text-right"
                            value={rate}
                            onChange={(event) => setRate(event.target.value.replace(/[^\d.,]/g, ""))}
                        />
                        <OptionSelect
                            options={PERIOD_OPTIONS}
                            value={ratePeriod}
                            onChange={(value) => setRatePeriod((value as RatePeriod) ?? "monthly")}
                        />
                    </div>
                    {ratePeriod === "yearly" && ratePercent > 0 ? (
                        <p className="text-muted-foreground text-xs">
                            Equivale a {formatPercent(result.monthlyRatePercent)} ao mês (composto).
                        </p>
                    ) : null}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="sim-reinvest">Proventos reinvestidos (%)</Label>
                    <Input
                        id="sim-reinvest"
                        inputMode="decimal"
                        autoComplete="off"
                        className="money text-right"
                        value={reinvest}
                        onChange={(event) => setReinvest(event.target.value.replace(/[^\d.,]/g, ""))}
                        aria-invalid={parseDecimal(reinvest) > 100 || undefined}
                    />
                    <p className="text-muted-foreground text-xs">100% = tudo volta pra carteira; 0% = você gasta os proventos.</p>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="sim-years">Prazo (anos)</Label>
                    <Input
                        id="sim-years"
                        inputMode="numeric"
                        autoComplete="off"
                        className="money text-right"
                        value={yearsText}
                        onChange={(event) => setYearsText(event.target.value.replace(/\D/g, ""))}
                        aria-invalid={Number(yearsText) > MAX_YEARS || undefined}
                    />
                    <p className="text-muted-foreground text-xs">De 1 a {MAX_YEARS} anos.</p>
                </div>
            </section>

            <div className="min-w-0 space-y-6">
                {years === 0 ? (
                    <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground text-sm">
                        Informe um prazo de pelo menos 1 ano pra simular.
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-4 xl:grid-cols-4">
                            <div>
                                <p className="text-muted-foreground text-xs">Patrimônio final</p>
                                <AnimatedMoney cents={result.balanceCents} className="text-lg sm:text-xl" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Total investido</p>
                                <AnimatedMoney cents={result.investedCents} className="text-lg sm:text-xl" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Rendimento</p>
                                <Money cents={gainCents} tone="income" className="text-lg sm:text-xl" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Renda mensal no fim</p>
                                <AnimatedMoney cents={result.monthlyIncomeCents} className="text-lg sm:text-xl" />
                            </div>
                        </div>

                        <section className="rounded-2xl border bg-card p-4">
                            <h2 className="mb-4 font-heading font-medium text-sm">Evolução do patrimônio</h2>
                            <GrowthChart rows={result.rows} />
                        </section>

                        <section className="rounded-2xl border bg-card p-4">
                            <h2 className="mb-2 font-heading font-medium text-sm">Ano a ano</h2>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ano</TableHead>
                                        <TableHead className="text-right">Investido</TableHead>
                                        <TableHead className="text-right">Proventos no ano</TableHead>
                                        <TableHead className="text-right">Renda mensal</TableHead>
                                        <TableHead className="text-right">Patrimônio</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {result.rows.map((row) => (
                                        <TableRow key={row.year}>
                                            <TableCell className="money">{row.year}</TableCell>
                                            <TableCell className="text-right">
                                                <Money cents={row.investedCents} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Money cents={row.incomeCents} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Money cents={row.monthlyIncomeCents} />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                <Money cents={row.balanceCents} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </section>

                        <p className="text-muted-foreground text-xs">
                            Estimativa: yield constante, sem imposto, sem variação de cota. O provento do mês vem da carteira
                            do mês anterior e o aporte entra no fim do mês.
                            {result.withdrawnIncomeCents > 0 ? (
                                <>
                                    {" "}
                                    Proventos não reinvestidos somam <Money cents={result.withdrawnIncomeCents} /> no período.
                                </>
                            ) : null}
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
