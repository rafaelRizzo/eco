// Trilha de navegação da barra superior, montada a partir do `staticData.crumb` de cada rota casada.
// Crumb dinâmico (ex.: nome do cartão) é um componente que recebe os params da rota.
import { Link, useMatches } from "@tanstack/react-router"
import { Fragment } from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

type Crumb = string | React.ComponentType<{ params: Record<string, string> }>

declare module "@tanstack/react-router" {
    interface StaticDataRouteOption {
        crumb?: Crumb
    }
}

function CrumbLabel({ crumb, params }: { crumb: Crumb; params: Record<string, string> }) {
    if (typeof crumb === "string") return crumb
    const Component = crumb
    return <Component params={params} />
}

export function AppBreadcrumb({ className }: { className?: string }) {
    const matches = useMatches()
    const trail = matches.flatMap((match) =>
        match.staticData.crumb
            ? [{ id: match.id, pathname: match.pathname, crumb: match.staticData.crumb, params: match.params }]
            : [],
    )
    const onDashboard = trail[0]?.pathname === "/dashboard"
    // No celular a trilha só aparece em página aninhada (ex.: detalhe do cartão); nas demais fica a marca.
    const nested = trail.length > 1

    return (
        <>
            {nested ? null : <span className={cn("font-heading font-semibold text-xl lg:hidden", className)}>eco</span>}
            <Breadcrumb className={cn("min-w-0", !nested && "hidden lg:block", className)}>
                <BreadcrumbList className="flex-nowrap">
                    {/* Painel é a raiz de tudo; no celular sai pra caber (a barra inferior já leva até ele). */}
                    {onDashboard ? null : (
                        <>
                            <BreadcrumbItem className="hidden lg:inline-flex">
                                <BreadcrumbLink render={<Link to="/dashboard" />}>Painel</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden lg:block" />
                        </>
                    )}
                    {trail.map((item, index) => {
                        const last = index === trail.length - 1
                        return (
                            <Fragment key={item.id}>
                                {index > 0 ? <BreadcrumbSeparator /> : null}
                                <BreadcrumbItem className={cn(last && "min-w-0")}>
                                    {last ? (
                                        <BreadcrumbPage className="truncate font-medium">
                                            <CrumbLabel crumb={item.crumb} params={item.params} />
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink render={<Link to={item.pathname} />}>
                                            <CrumbLabel crumb={item.crumb} params={item.params} />
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </Fragment>
                        )
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </>
    )
}
