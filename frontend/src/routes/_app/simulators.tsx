// Página de simuladores: hoje só o de juros compostos para FIIs.
import { createFileRoute } from "@tanstack/react-router"
import { FiiCompoundSimulator } from "@/components/Simulators/fii-compound-simulator"
import { PageHeader } from "@/components/page-header"

export const Route = createFileRoute("/_app/simulators")({
    staticData: { crumb: "Simuladores" },
    component: SimulatorsPage,
})

function SimulatorsPage() {
    return (
        <>
            <PageHeader title="Simuladores" description="Juros compostos para FIIs: aportes, proventos reinvestidos e prazo" />
            <FiiCompoundSimulator />
        </>
    )
}
