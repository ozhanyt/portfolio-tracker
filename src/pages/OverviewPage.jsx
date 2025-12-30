import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Plus, Trash2, Pencil, Check, X as XIcon, GripVertical } from 'lucide-react'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'
import { useMarketData } from '@/hooks/useMarketData'
import { subscribeToFunds, deleteFund, updateFundName, updateFundsOrder } from '@/services/firestoreService'
import { useAdmin } from '@/contexts/AdminContext'
import { AddFundDialog } from '@/components/AddFundDialog'
import { ShareOnTwitterButton } from '@/components/ShareOnTwitterButton'
import { useStockPriceUpdates } from '@/hooks/useStockPriceUpdates'

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableFundCard({ fund, isAdmin, navigate, handleDeleteFund, calculateFundReturn, getCurrentTime, rates, onReturnUpdate }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: fund.id, disabled: !isAdmin });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    // Local state for live data
    const [liveHoldings, setLiveHoldings] = useState(fund.holdings || [])
    const [lastUpdateTime, setLastUpdateTime] = useState(fund.lastUpdateTime)

    // Use hook for THIS fund to get correct time and data
    const { error } = useStockPriceUpdates(fund.holdings, (updatedHoldings) => {
        // console.log(`🔄 Update for ${fund.id}:`, updatedHoldings)
        setLiveHoldings(updatedHoldings)

        // Find update time from any stock
        const time = updatedHoldings.find(h => h.updateTime)?.updateTime
        // console.log(`⏰ Time for ${fund.id}:`, time)

        if (time) {
            setLastUpdateTime(time)
        } else {
            // console.warn(`⚠️ No updateTime found for ${fund.id}`)
        }
    }, fund.id, 60000)

    if (error) {
        console.error(`❌ Error updating ${fund.id}:`, error)
    }

    let { totalReturn, totalValue, totalProfit } = calculateFundReturn(liveHoldings, fund.multiplier, rates, fund.ppfRate)

    // Report live return to parent
    useEffect(() => {
        if (onReturnUpdate && totalReturn !== undefined) {
            onReturnUpdate(fund.id, totalReturn)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalReturn, fund.id])

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(fund.name)

    const handleSaveName = async (e) => {
        e.stopPropagation()
        if (editName.trim() !== fund.name) {
            await updateFundName(fund.id, editName)
        }
        setIsEditing(false)
    }

    const handleCancelEdit = (e) => {
        e.stopPropagation()
        setEditName(fund.name)
        setIsEditing(false)
    }

    return (
        <div ref={setNodeRef} style={style} className="relative group h-full">
            <Card
                onClick={() => !isEditing && navigate(`/portfolio/${fund.id}`)}
                className={cn(
                    "border-l-4 border-l-primary shadow-md hover:shadow-xl transition-all cursor-pointer hover:scale-105 relative h-full flex flex-col",
                    isDragging && "shadow-2xl scale-105 ring-2 ring-primary"
                )}
            >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl font-bold">{fund.code}</CardTitle>
                                {isAdmin && (
                                    <div
                                        {...attributes}
                                        {...listeners}
                                        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <GripVertical className="h-4 w-4" />
                                    </div>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveName} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button onClick={handleCancelEdit} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group/title min-w-0">
                                    <p className="text-sm text-muted-foreground mt-1 truncate pr-2">{fund.name}</p>
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setIsEditing(true)
                                            }}
                                            className="p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 pl-2 flex-shrink-0">
                            {totalReturn >= 0 ? (
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            ) : (
                                <TrendingDown className="h-6 w-6 text-red-600" />
                            )}
                            {isAdmin && (
                                <button
                                    onClick={(e) => handleDeleteFund(e, fund.id)}
                                    className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    title="Fonu Sil"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground">Günlük Getiri</p>
                            <p className={cn("text-3xl font-bold", totalReturn >= 0 ? "text-green-600" : "text-red-600")}>
                                {totalReturn >= 0 ? '+' : ''}{formatPercent(totalReturn)}
                            </p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <div>
                                <p className="text-xs text-muted-foreground">Portföy Değeri</p>
                                <p className="text-sm font-medium">
                                    {totalValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Kar/Zarar</p>
                                <p className={cn("text-sm font-medium", totalProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                    {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
                                </p>
                            </div>
                        </div>
                        <div className="text-right pt-2">
                            <span className="text-[10px] text-muted-foreground">
                                Son Güncelleme: {lastUpdateTime || getCurrentTime()}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function OverviewPage({ isDarkMode, setIsDarkMode }) {
    const navigate = useNavigate()
    const [funds, setFunds] = useState([])
    const [liveUpdateTime, setLiveUpdateTime] = useState(null)
    const [liveReturns, setLiveReturns] = useState({})
    const { marketData, isLoading } = useMarketData(60000)
    const { isAdmin } = useAdmin()
    const [isAddFundOpen, setIsAddFundOpen] = useState(false)
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Use hook just to get rates (pass empty portfolio)
    const { rates } = useStockPriceUpdates([], null, null, 60000)

    // Separate hook for first fund to get live updateTime
    const firstFundHoldings = funds[0]?.holdings || []
    useStockPriceUpdates(firstFundHoldings, (updatedHoldings) => {
        const time = updatedHoldings.find(h => h.updateTime)?.updateTime
        if (time) setLiveUpdateTime(time)
    }, funds[0]?.id, 60000)

    useEffect(() => {
        const unsubscribe = subscribeToFunds((fundsData) => {
            setFunds(fundsData)
        })
        return () => unsubscribe()
    }, [])

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setFunds((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Update order in Firestore
                updateFundsOrder(newOrder);

                return newOrder;
            });
        }
        setActiveId(null);
    };

    const calculateFundReturn = (portfolio, multiplier = 1, rates = {}, ppfRate = 0) => {
        if (!portfolio || portfolio.length === 0) return { totalReturn: 0, totalValue: 0, totalProfit: 0 }

        const calculated = portfolio.map(item => {
            let currentValue, totalCost

            const currency = item.currency || (item.isForeign ? 'USD' : 'TRY')
            const rateData = rates[currency] || { current: 1, prev: 1 }
            const currentRate = rateData.current
            const previousRate = rateData.prev

            currentValue = item.quantity * item.currentPrice * currentRate
            totalCost = item.quantity * item.cost * previousRate

            return {
                currentValue,
                totalCost,
                profit: currentValue - totalCost
            }
        })

        const totalValue = calculated.reduce((sum, item) => sum + item.currentValue, 0)
        const totalCost = calculated.reduce((sum, item) => sum + item.totalCost, 0)
        let totalProfit = totalValue - totalCost

        // Apply Multiplier and PPF Calculation
        if (multiplier) {
            const stockWeight = multiplier
            const ppfWeight = 1 - stockWeight
            const ppfProfit = totalCost * (ppfRate || 0) * ppfWeight

            // totalProfit currently holds the raw stock profit
            totalProfit = (totalProfit * stockWeight) + ppfProfit
        }

        const totalReturn = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0

        return { totalReturn, totalValue, totalProfit }
    }

    const handleDeleteFund = async (e, fundId) => {
        e.stopPropagation()
        if (window.confirm('Bu fonu silmek istediğinize emin misiniz?')) {
            await deleteFund(fundId)
        }
    }

    const getCurrentTime = () => {
        const now = new Date()
        return now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="min-h-screen bg-background p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex items-center justify-between pb-6 border-b">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Fon Özet</h1>
                        <p className="text-muted-foreground mt-1">Tüm fonların genel görünümü</p>
                    </div>
                    <div className="flex gap-3">
                        {isAdmin && (
                            <div className="flex items-center gap-2">
                                <ShareOnTwitterButton
                                    funds={(funds || []).map(f => ({
                                        code: f.id,
                                        returnRate: liveReturns[f.id] !== undefined
                                            ? liveReturns[f.id]
                                            : calculateFundReturn(f.holdings || [], f.multiplier, rates, f.ppfRate).totalReturn
                                    }))}
                                    updateTime={liveUpdateTime}
                                />
                                <button
                                    onClick={() => setIsAddFundOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    Fon Ekle
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            {isDarkMode ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="M12 2v2" />
                                        <path d="M12 20v2" />
                                        <path d="m4.93 4.93 1.41 1.41" />
                                        <path d="m17.66 17.66 1.41 1.41" />
                                        <path d="M2 12h2" />
                                        <path d="M20 12h2" />
                                        <path d="m6.34 17.66-1.41 1.41" />
                                        <path d="m19.07 4.93-1.41 1.41" />
                                    </svg>
                                    <span className="text-sm font-medium">Açık</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                                    </svg>
                                    <span className="text-sm font-medium">Koyu</span>
                                </>
                            )}
                        </button>
                    </div>
                </header>

                {/* Market Indicators */}
                <div className="bg-card backdrop-blur rounded-lg px-6 py-4 border border-border">
                    {isLoading ? (
                        <div className="text-center text-sm text-muted-foreground py-2">
                            Yükleniyor...
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {marketData
                                .filter(m => ['USDTRY', 'BIST100', 'BTCUSD', 'GOLD_TL', 'SILVER_TL'].includes(m.symbol))
                                .map((market) => (
                                    <div
                                        key={market.symbol}
                                        className="flex flex-col"
                                    >
                                        <div className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                                            {market.symbol}
                                            {market.symbol === 'BIST100' && (
                                                <span className="text-[10px] bg-yellow-500/20 text-yellow-600 px-1 rounded">G</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                            <span className="text-base sm:text-xl font-bold text-foreground tracking-tight transition-all duration-700 tabular-nums">
                                                {market.symbol === 'BTCUSD' ? (
                                                    `$${market.price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                                                ) : market.symbol === 'BIST100' ? (
                                                    market.price?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
                                                ) : market.symbol === 'USDTRY' ? (
                                                    market.price?.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                                                ) : (
                                                    market.price?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                )}
                                            </span>
                                            <span className={cn(
                                                "text-sm sm:text-xl font-semibold transition-all duration-700 sm:w-28 text-left sm:text-right tabular-nums",
                                                market.changePercent > 0 ? "text-green-500" :
                                                    market.changePercent < 0 ? "text-red-500" :
                                                        "text-muted-foreground"
                                            )}>
                                                % {market.changePercent > 0 ? '+' : ''}{market.changePercent?.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={(funds || []).map(f => f.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {(funds || []).map((fund) => {
                                return (
                                    <SortableFundCard
                                        key={fund.id}
                                        fund={fund}
                                        isAdmin={isAdmin}
                                        navigate={navigate}
                                        handleDeleteFund={handleDeleteFund}
                                        calculateFundReturn={calculateFundReturn}
                                        getCurrentTime={getCurrentTime}
                                        usdRate={rates?.USD?.current}
                                        prevUsdRate={rates?.USD?.prev}
                                        rates={rates}
                                        onReturnUpdate={(fundId, returnValue) => {
                                            setLiveReturns(prev => ({ ...prev, [fundId]: returnValue }))
                                        }}
                                    />
                                )
                            })}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeId ? (
                            <SortableFundCard
                                fund={funds.find(f => f.id === activeId)}
                                isAdmin={isAdmin}
                                navigate={navigate}
                                handleDeleteFund={handleDeleteFund}
                                calculateFundReturn={calculateFundReturn}
                                getCurrentTime={getCurrentTime}
                                usdRate={rates?.USD?.current}
                                prevUsdRate={rates?.USD?.prev}
                                rates={rates}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {funds.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Henüz fon eklenmemiş</p>
                    </div>
                )}

                <AddFundDialog
                    isOpen={isAddFundOpen}
                    onClose={() => setIsAddFundOpen(false)}
                />
            </div>
        </div>
    )
}
