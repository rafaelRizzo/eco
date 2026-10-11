// Cabeçalho padrão de página: título, linha de contexto e ações à direita.
type Props = {
    title: string
    description?: React.ReactNode
    actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: Props) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl sm:text-3xl">{title}</h1>
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    )
}
