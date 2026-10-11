// Moldura das telas de login/cadastro: painel de marca com a régua do mês animada + formulário.
import { motion } from "motion/react"

type Props = { title: string; subtitle: string; children: React.ReactNode }

// Marcadores decorativos da régua: dias com "vencimento" (posição em % e cor).
const TICKS = [
    { left: 12, tone: "bg-sidebar-primary" },
    { left: 33, tone: "bg-sidebar-foreground" },
    { left: 48, tone: "bg-sidebar-primary" },
    { left: 71, tone: "bg-sidebar-foreground" },
    { left: 86, tone: "bg-sidebar-primary" },
]

export function AuthLayout({ title, subtitle, children }: Props) {
    return (
        <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
            {/* `dark` fixa o painel de marca escuro nos dois temas (a sidebar do app é que segue o tema). */}
            <section className="dark relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
                <span className="font-heading font-semibold text-3xl text-sidebar-accent-foreground">eco</span>

                <div className="space-y-10">
                    <h2 className="max-w-md font-heading font-semibold text-5xl text-sidebar-accent-foreground leading-[1.05]">
                        O mês inteiro numa régua só.
                    </h2>
                    <div className="relative h-16" aria-hidden>
                        <motion.div
                            className="absolute top-8 h-px w-full origin-left bg-sidebar-foreground/30"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        />
                        {TICKS.map((tick, index) => (
                            <motion.span
                                key={tick.left}
                                className={`absolute top-5 h-7 w-1.5 rounded-full ${tick.tone}`}
                                style={{ left: `${tick.left}%` }}
                                initial={{ scaleY: 0, opacity: 0 }}
                                animate={{ scaleY: 1, opacity: 1 }}
                                transition={{ delay: 0.5 + index * 0.12, type: "spring", stiffness: 300, damping: 18 }}
                            />
                        ))}
                    </div>
                    <p className="max-w-sm text-sidebar-foreground/70">
                        Mensalidades lançadas sozinhas, faturas que fecham no dia certo e aviso antes de cada
                        vencimento.
                    </p>
                </div>

                <p className="text-sidebar-foreground/50 text-xs">Controle de gastos pessoal</p>
            </section>

            <section className="flex items-center justify-center p-6">
                <motion.div
                    className="w-full max-w-sm space-y-8"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <div className="space-y-2">
                        <span className="font-heading font-semibold text-2xl lg:hidden">eco</span>
                        <h1 className="font-semibold text-3xl">{title}</h1>
                        <p className="text-muted-foreground text-sm">{subtitle}</p>
                    </div>
                    {children}
                </motion.div>
            </section>
        </main>
    )
}
