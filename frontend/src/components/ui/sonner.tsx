// Toaster do sonner com ícones lucide e tema sincronizado com o ThemeProvider do app.
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/components/theme-provider"

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme } = useTheme()

    return (
        <Sonner
            theme={theme}
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                    "--border-radius": "var(--radius)",
                    // richColors com a paleta do projeto: neutral/emerald; o erro usa o vermelho padrão do Sonner.
                    "--success-bg": "var(--accent)",
                    "--success-text": "var(--accent-foreground)",
                    "--success-border": "color-mix(in oklch, var(--primary) 35%, transparent)",
                    // Erro: sem override, vale o vermelho padrão do Sonner (richColors).
                    "--warning-bg": "var(--secondary)",
                    "--warning-text": "var(--foreground)",
                    "--warning-border": "var(--border)",
                    "--info-bg": "var(--popover)",
                    "--info-text": "var(--popover-foreground)",
                    "--info-border": "var(--border)",
                } as React.CSSProperties
            }
            toastOptions={{ classNames: { toast: "cn-toast" } }}
            {...props}
        />
    )
}

export { Toaster }
