// Layout de cartões: só repassa pra listagem (index) ou detalhe ($id).
import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/credit-cards")({
    staticData: { crumb: "Cartões" },
    component: () => <Outlet />,
})
