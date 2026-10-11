// Página de investimentos: carteira (posição e alocação), operações de compra/venda e proventos por mês.
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeftRightIcon, LineChartIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { z } from "zod"
import { AnimatedMoney } from "@/components/animated-money"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { AllocationChart } from "@/components/Investments/allocation-chart"
import { AssetFormDialog } from "@/components/Investments/asset-form-dialog"
import { AssetsList } from "@/components/Investments/assets-list"
import { DividendsDueBanner } from "@/components/Investments/dividends-due-banner"
import { DividendFormDialog } from "@/components/Investments/dividend-form-dialog"
import { DividendsView } from "@/components/Investments/dividends-view"
import { PriceDialog } from "@/components/Investments/price-dialog"
import { TradeFormDialog } from "@/components/Investments/trade-form-dialog"
import { TradesList } from "@/components/Investments/trades-list"
import { Money } from "@/components/money"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type AssetTrade, useAssetTrades } from "@/hooks/use-asset-trades"
import { useAccounts } from "@/hooks/use-accounts"
import { type Asset, toAssetPayload, useAssets } from "@/hooks/use-assets"
import { type Dividend, useDividends, useDividendsDue } from "@/hooks/use-dividends"
import { currentMonthKey, formatDate } from "@/lib/format"

const searchSchema = z.object({
    tab: z.enum(["portfolio", "trades", "dividends"]).optional().catch(undefined),
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional()
        .catch(undefined),
})

export const Route = createFileRoute("/_app/investments")({
    staticData: { crumb: "Investimentos" },
    validateSearch: searchSchema,
    component: InvestmentsPage,
})

type Tab = "portfolio" | "trades" | "dividends"

function InvestmentsPage() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    const tab: Tab = search.tab ?? "portfolio"
    const month = search.month ?? currentMonthKey()

    const { assets, summary, loading, createAsset, updateAsset, deleteAsset } = useAssets()
    const { trades, loading: tradesLoading, createTrade, deleteTrade } = useAssetTrades()
    const { createDividend, updateDividend, deleteDividend } = useDividends(month)
    const { accounts } = useAccounts()
    const { dueCount, dueCents } = useDividendsDue()

    const [assetFormOpen, setAssetFormOpen] = useState(false)
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
    const [pricingAsset, setPricingAsset] = useState<Asset | null>(null)
    const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null)
    const [tradeOpen, setTradeOpen] = useState(false)
    const [tradeAssetId, setTradeAssetId] = useState<string | null>(null)
    const [deletingTrade, setDeletingTrade] = useState<AssetTrade | null>(null)
    const [dividendOpen, setDividendOpen] = useState(false)
    const [editingDividend, setEditingDividend] = useState<Dividend | null>(null)
    const [receivingDividend, setReceivingDividend] = useState(false)
    const [deletingDividend, setDeletingDividend] = useState<Dividend | null>(null)

    const setSearchParam = (patch: Partial<z.infer<typeof searchSchema>>) =>
        navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

    const openNewAsset = () => {
        setEditingAsset(null)
        setAssetFormOpen(true)
    }
    const openTrade = (assetId: string | null) => {
        setTradeAssetId(assetId)
        setTradeOpen(true)
    }
    const openNewDividend = () => {
        setEditingDividend(null)
        setReceivingDividend(false)
        setDividendOpen(true)
    }

    const action =
        tab === "portfolio" ? (
            <Button onClick={openNewAsset}>
                <PlusIcon />
                Novo ativo
            </Button>
        ) : tab === "trades" ? (
            <Button onClick={() => openTrade(null)} disabled={assets.length === 0}>
                <PlusIcon />
                Nova operação
            </Button>
        ) : (
            <Button onClick={openNewDividend} disabled={assets.length === 0}>
                <PlusIcon />
                Novo provento
            </Button>
        )

    return (
        <>
            <PageHeader
                title="Investimentos"
                description={
                    assets.length ? (
                        <>
                            Patrimônio: <AnimatedMoney cents={summary.totalValueCents} className="text-foreground" />
                        </>
                    ) : (
                        "Ações, FIIs, cripto, dólar e os proventos de cada mês"
                    )
                }
                actions={action}
            />

            <Tabs value={tab} onValueChange={(value) => setSearchParam({ tab: value as Tab })}>
                <TabsList>
                    <TabsTrigger value="portfolio">Carteira</TabsTrigger>
                    <TabsTrigger value="trades">Operações</TabsTrigger>
                    <TabsTrigger value="dividends">
                        Proventos
                        {dueCount > 0 ? (
                            <span className="money ml-1.5 grid size-4 place-items-center rounded-full bg-foreground text-[0.65rem] text-background">
                                {dueCount}
                            </span>
                        ) : null}
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {tab !== "dividends" ? (
                <DividendsDueBanner
                    count={dueCount}
                    cents={dueCents}
                    onOpen={() => setSearchParam({ tab: "dividends", month: undefined })}
                />
            ) : null}

            {tab === "portfolio" ? (
                loading ? (
                    <Skeleton className="h-64 rounded-2xl" />
                ) : assets.length === 0 ? (
                    <Empty className="border border-dashed">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <LineChartIcon />
                            </EmptyMedia>
                            <EmptyTitle>Nenhum ativo ainda</EmptyTitle>
                            <EmptyDescription>
                                Cadastre um ativo, registre suas compras e acompanhe preço médio, lucro e proventos.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button onClick={openNewAsset}>
                                <PlusIcon />
                                Cadastrar primeiro ativo
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-3 rounded-2xl border bg-card p-4">
                            <div>
                                <p className="text-muted-foreground text-xs">Valor atual</p>
                                <AnimatedMoney cents={summary.totalValueCents} className="text-lg sm:text-xl" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Investido</p>
                                <AnimatedMoney cents={summary.totalCostCents} className="text-lg sm:text-xl" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Resultado</p>
                                <Money cents={summary.profitCents} tone="signed" className="text-lg sm:text-xl" />
                            </div>
                        </div>
                        <AssetsList
                            assets={assets}
                            onTrade={(asset) => openTrade(asset.id)}
                            onPrice={setPricingAsset}
                            onEdit={(asset) => {
                                setEditingAsset(asset)
                                setAssetFormOpen(true)
                            }}
                            onDelete={setDeletingAsset}
                        />
                        <section className="rounded-2xl border bg-card p-4">
                            <h2 className="mb-4 font-heading font-medium text-sm">Alocação por classe</h2>
                            <AllocationChart byClass={summary.byClass} />
                        </section>
                    </div>
                )
            ) : null}

            {tab === "trades" ? (
                tradesLoading ? (
                    <Skeleton className="h-48 rounded-2xl" />
                ) : trades.length === 0 ? (
                    <Empty className="border border-dashed">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <ArrowLeftRightIcon />
                            </EmptyMedia>
                            <EmptyTitle>Nenhuma operação registrada</EmptyTitle>
                            <EmptyDescription>
                                {assets.length
                                    ? "Registre suas compras e vendas pra calcular preço médio e posição."
                                    : "Cadastre um ativo na aba Carteira antes de registrar operações."}
                            </EmptyDescription>
                        </EmptyHeader>
                        {assets.length ? (
                            <EmptyContent>
                                <Button onClick={() => openTrade(null)}>
                                    <PlusIcon />
                                    Registrar operação
                                </Button>
                            </EmptyContent>
                        ) : null}
                    </Empty>
                ) : (
                    <TradesList trades={trades} onDelete={setDeletingTrade} />
                )
            ) : null}

            {tab === "dividends" ? (
                <DividendsView
                    month={month}
                    onMonthChange={(next) => setSearchParam({ month: next === currentMonthKey() ? undefined : next })}
                    hasAssets={assets.length > 0}
                    onCreate={openNewDividend}
                    onEdit={(dividend) => {
                        setEditingDividend(dividend)
                        setReceivingDividend(false)
                        setDividendOpen(true)
                    }}
                    onReceive={(dividend) => {
                        setEditingDividend(dividend)
                        setReceivingDividend(true)
                        setDividendOpen(true)
                    }}
                    onDelete={setDeletingDividend}
                />
            ) : null}

            <AssetFormDialog
                open={assetFormOpen}
                onOpenChange={setAssetFormOpen}
                asset={editingAsset}
                onSubmit={async (form) =>
                    editingAsset
                        ? updateAsset(editingAsset.id, toAssetPayload(form))
                        : createAsset(form)
                }
            />
            <PriceDialog
                open={!!pricingAsset}
                onOpenChange={(open) => !open && setPricingAsset(null)}
                asset={pricingAsset}
                onSubmit={(cents) =>
                    pricingAsset ? updateAsset(pricingAsset.id, { currentPriceCents: cents || null }) : Promise.resolve(false)
                }
            />
            <TradeFormDialog
                open={tradeOpen}
                onOpenChange={setTradeOpen}
                assets={assets}
                defaultAssetId={tradeAssetId}
                onSubmit={createTrade}
            />
            <DividendFormDialog
                open={dividendOpen}
                onOpenChange={setDividendOpen}
                assets={assets}
                accounts={accounts}
                dividend={editingDividend}
                receiving={receivingDividend}
                // Estimativa não existe no banco: confirmar o recebimento dela cria o provento de verdade.
                onSubmit={(form) =>
                    editingDividend && editingDividend.status !== "estimated"
                        ? updateDividend(editingDividend.id, form)
                        : createDividend(form)
                }
            />

            <ConfirmDeleteDialog
                open={!!deletingAsset}
                onOpenChange={(open) => !open && setDeletingAsset(null)}
                title={`Excluir ${deletingAsset?.ticker ?? "ativo"}?`}
                description="Apaga o ativo com todas as operações e proventos dele. Os proventos já creditados em conta saem do saldo e de Entradas. Essa ação não pode ser desfeita."
                confirmLabel="Excluir ativo"
                onConfirm={() => (deletingAsset ? deleteAsset(deletingAsset.id) : Promise.resolve(false))}
            />
            <ConfirmDeleteDialog
                open={!!deletingTrade}
                onOpenChange={(open) => !open && setDeletingTrade(null)}
                title="Excluir operação?"
                description={
                    deletingTrade
                        ? `${deletingTrade.ticker} em ${formatDate(deletingTrade.tradedAt)}. O preço médio e a posição serão recalculados.`
                        : ""
                }
                confirmLabel="Excluir operação"
                onConfirm={() => (deletingTrade ? deleteTrade(deletingTrade.id) : Promise.resolve(false))}
            />
            <ConfirmDeleteDialog
                open={!!deletingDividend}
                onOpenChange={(open) => !open && setDeletingDividend(null)}
                title="Excluir provento?"
                description={
                    deletingDividend
                        ? `${deletingDividend.ticker}, pagamento em ${formatDate(deletingDividend.payDate)}.`
                        : ""
                }
                confirmLabel="Excluir provento"
                onConfirm={() => (deletingDividend ? deleteDividend(deletingDividend.id) : Promise.resolve(false))}
            />
        </>
    )
}
