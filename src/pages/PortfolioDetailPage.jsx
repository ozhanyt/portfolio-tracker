import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, TrendingUp, TrendingDown, Wallet, Plus, ArrowLeft, RefreshCw, Settings } from 'lucide-react'
import { PortfolioTable } from '@/components/PortfolioTable'
import { AddStockDialog } from '@/components/AddStockDialog'
import { formatCurrency, formatPercent, formatNumber, cn } from '@/lib/utils'
import { useStockPriceUpdates } from '@/hooks/useStockPriceUpdates'

import { subscribeToFund, updateFundHoldings, updateFundMultiplier, updateFundTotals, updateFundPpfRate } from '../services/firestoreService'
import { useAdmin } from '@/contexts/AdminContext'

export function PortfolioDetailPage({ isDarkMode, setIsDarkMode }) {
  const { fundCode } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAdmin()

  const [fundData, setFundData] = useState(null)
  const [portfolio, setPortfolio] = useState([])
  const [multiplier, setMultiplier] = useState(1)
  const [ppfRate, setPpfRate] = useState(0)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingStock, setEditingStock] = useState(null)

  const latestPricesRef = useRef({})

  // Subscribe to fund data
  useEffect(() => {
    const unsubscribe = subscribeToFund(fundCode, (data) => {
      if (data) {
        setFundData(data)

        // Merge incoming Firestore holdings with locally cached prices
        // This prevents the UI from reverting to stale prices when Firestore updates (e.g. after saving totals)
        const mergedHoldings = (data.holdings || []).map(item => {
          const cachedPrice = latestPricesRef.current[item.code]
          if (cachedPrice) {
            return {
              ...item,
              currentPrice: cachedPrice.currentPrice,
              prevClose: cachedPrice.prevClose,
              quantity: cachedPrice.quantity || item.quantity,
              cost: cachedPrice.prevClose,
              lastRolloverDate: cachedPrice.lastRolloverDate || item.lastRolloverDate
            }
          }
          return item
        })

        setPortfolio(mergedHoldings)
        setMultiplier(data.multiplier || 1)
        setPpfRate(data.ppfRate || 0)
      } else {
        // Fund not found
        navigate('/')
      }
    })
    return () => unsubscribe()
  }, [fundCode, navigate])

  // Auto-update stock prices
  const handlePriceUpdate = async (prices) => {
    // Update the ref with new prices
    prices.forEach(p => {
      latestPricesRef.current[p.code] = p
    })

    const newPortfolio = portfolio.map(item => {
      const priceData = prices.find(p => p.code === item.code)
      if (priceData) {
        return {
          ...item,
          currentPrice: priceData.currentPrice,
          prevClose: priceData.prevClose,
          quantity: priceData.quantity || item.quantity, // Sync quantity from Sheet API
          cost: priceData.prevClose, // Sync cost with prevClose for daily tracking
          lastRolloverDate: priceData.lastRolloverDate || item.lastRolloverDate || null // Update rollover date if present
        }
      }
      return item
    })

    setPortfolio(newPortfolio)
  }

  const { lastUpdate, isUpdating, error, usdRate, prevUsdRate } = useStockPriceUpdates(portfolio, handlePriceUpdate, 60000)

  // Calculate portfolio values
  const calculatedPortfolio = portfolio.map(item => {
    let currentValue, totalCost, profitTL

    if (item.isForeign) {
      // Foreign Stock Calculation (Method B)
      // Profit = (Current Price * Current Rate) - (Prev Close * Prev Rate)
      // Note: item.cost is synced with prevClose for daily tracking

      const currentRate = usdRate || 34.50
      const previousRate = prevUsdRate || currentRate // Fallback to current if prev not available

      const currentPriceTL = item.currentPrice * currentRate
      const prevPriceTL = item.cost * previousRate // item.cost is effectively prevClose

      currentValue = currentPriceTL * item.quantity
      totalCost = prevPriceTL * item.quantity // This is the "Daily Cost" basis
      profitTL = currentValue - totalCost
    } else {
      // Local Stock Calculation
      currentValue = item.currentPrice * item.quantity
      totalCost = item.cost * item.quantity
      profitTL = (item.currentPrice - item.cost) * item.quantity
    }

    return {
      ...item,
      currentValue,
      totalCost,
      profitTL,
      returnRate: totalCost > 0 ? (profitTL / totalCost) * 100 : 0,
      originalCurrency: item.isForeign ? 'USD' : 'TRY'
    }
  })

  const totalValue = calculatedPortfolio.reduce((sum, item) => sum + item.currentValue, 0)
  // Use the calculated totalCost which handles currency conversion
  const totalCost = calculatedPortfolio.reduce((sum, item) => sum + item.totalCost, 0)
  let totalProfit = totalValue - totalCost

  // Apply Multiplier and PPF Calculation
  // Total Profit = (Stock Profit * Multiplier) + (Total Cost * PPF Rate * (1 - Multiplier))

  // Ensure multiplier is a number
  const multiplierVal = parseFloat(multiplier) || 1
  const ppfRateVal = parseFloat(ppfRate) || 0

  if (multiplierVal) {
    const stockWeight = multiplierVal
    const ppfWeight = 1 - stockWeight
    const ppfProfit = totalCost * ppfRateVal * ppfWeight

    // totalProfit currently holds the raw stock profit
    totalProfit = (totalProfit * stockWeight) + ppfProfit
  }

  const totalReturnPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

  // Sync totals to Firestore for Overview Page
  const isSyncingRef = useRef(false)

  useEffect(() => {
    const now = Date.now()
    const STORAGE_KEY = `last_fund_update_${fundCode}`
    const lastUpdate = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    const timeSinceLastUpdate = now - lastUpdate
    const MIN_UPDATE_INTERVAL = 5 * 60 * 1000 // 5 minutes throttle

    // Check if values are significantly different
    const isValueDifferent = fundData && (
      fundData.totalValue === undefined ||
      fundData.totalProfit === undefined ||
      Math.abs(fundData.totalValue - totalValue) > 1 ||
      Math.abs(fundData.totalProfit - totalProfit) > 1
    )

    // Initial sync (if never synced) or Time elapsed + Value changed
    const shouldUpdate = fundData && !isSyncingRef.current && (
      lastUpdate === 0 || (timeSinceLastUpdate > MIN_UPDATE_INTERVAL && isValueDifferent)
    )

    if (shouldUpdate) {
      isSyncingRef.current = true

      // Update storage immediately to prevent other tabs/reloads from triggering
      localStorage.setItem(STORAGE_KEY, now.toString())

      updateFundTotals(fundCode, {
        totalValue,
        totalProfit,
        returnRate: totalReturnPercent
      }).catch(console.error)
        .finally(() => {
          isSyncingRef.current = false
        })
    }
  }, [totalValue, totalProfit, totalReturnPercent, fundData, fundCode])



  // Add weights
  const finalData = calculatedPortfolio.map(item => ({
    ...item,
    weight: totalValue > 0 ? ((item.currentValue / totalValue) * 100) : 0
  }))

  const sortedData = [...finalData].sort((a, b) => b.weight - a.weight)

  const handleAddStock = async (newStock) => {
    let newPortfolio = [...portfolio]

    if (editingStock) {
      // Update existing stock
      newPortfolio = newPortfolio.map(p => p.code === editingStock.code ? {
        ...newStock,
        code: editingStock.code
      } : p)
      setEditingStock(null)
    } else {
      // Add new stock
      const existing = newPortfolio.find(p => p.code === newStock.code)
      if (existing) {
        const totalQty = existing.quantity + newStock.quantity
        const totalCost = (existing.quantity * existing.cost) + (newStock.quantity * newStock.cost)
        const avgCost = totalCost / totalQty

        newPortfolio = newPortfolio.map(p => p.code === newStock.code ? {
          ...p,
          quantity: totalQty,
          cost: avgCost,
          prevClose: avgCost,
          currentPrice: newStock.currentPrice
        } : p)
      } else {
        newPortfolio.push(newStock)
      }
    }

    // Save to Firestore
    await updateFundHoldings(fundCode, newPortfolio)
    // Local state will update via subscription
  }

  const handleEditStock = (stock) => {
    setEditingStock(stock)
    setIsAddModalOpen(true)
  }

  const handleRemoveStock = async (code) => {
    if (confirm(`${code} hissesini silmek istediğinize emin misiniz?`)) {
      const newPortfolio = portfolio.filter(item => item.code !== code)
      await updateFundHoldings(fundCode, newPortfolio)
    }
  }

  const [isSavingMultiplier, setIsSavingMultiplier] = useState(false)
  const [isSavingPpfRate, setIsSavingPpfRate] = useState(false)

  const handleMultiplierChange = async (e) => {
    // If triggered by onBlur, e.target.value is used.
    // If triggered by Enter key (optional), same.
    const val = parseFloat(multiplier) // Use state value which is updated by onChange

    if (isNaN(val)) return

    setIsSavingMultiplier(true)
    try {
      await updateFundMultiplier(fundCode, val)
    } catch (error) {
      console.error("Error saving multiplier:", error)
      alert("Hisse ağırlık oranı kaydedilemedi! Kota aşımı olabilir.")
    } finally {
      setIsSavingMultiplier(false)
    }
  }

  const handlePpfRateChange = async (e) => {
    const val = parseFloat(ppfRate)

    if (isNaN(val)) return

    setIsSavingPpfRate(true)
    try {
      await updateFundPpfRate(fundCode, val)
    } catch (error) {
      console.error("Error saving PPF rate:", error)
      alert("PPF oranı kaydedilemedi!")
    } finally {
      setIsSavingPpfRate(false)
    }
  }

  if (!fundData) return <div className="p-8 text-center">Yükleniyor...</div>

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">{fundCode}</h1>
              <p className="text-muted-foreground mt-1">{fundData.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Last update indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
              <RefreshCw className={cn("h-3 w-3", isUpdating && "animate-spin")} />
              {lastUpdate ? (
                <span>
                  Son: {new Date(lastUpdate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : (
                <span>Güncelleniyor...</span>
              )}
            </div>

            {usdRate && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50/50 dark:bg-green-900/20 text-xs text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50">
                <span className="font-semibold">USD:</span>
                <span>{usdRate.toFixed(4)} TL</span>
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
            {isAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Hisse Ekle</span>
              </button>
            )}
          </div>
        </header>



        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column: Total Value & Top Gainers */}
          <div className="space-y-6">
            <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow h-[180px] flex flex-col justify-center">
              <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CardTitle className="text-sm font-medium">
                    Toplam Portföy Değeri
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold tracking-tight">
                  {totalValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tüm varlıkların güncel toplamı
                </p>
              </CardContent>
            </Card>

            {/* Admin Multiplier Panel */}
            {isAdmin && (
              <Card className="shadow-md border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4 text-purple-500" />
                    Fon Ayarları (Admin)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stock Weight Input */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Hisse Ağırlık Oranı</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        step="0.0001"
                        value={multiplier}
                        onChange={(e) => setMultiplier(e.target.value)}
                        onBlur={handleMultiplierChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Örn: 0.85"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap w-24">
                        {isSavingMultiplier ? (
                          <span className="text-blue-500 animate-pulse">Kaydediliyor...</span>
                        ) : (
                          <span>Mevcut: {multiplier}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* PPF Rate Input */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">PPF Oranı (Mevduat/Repo)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        step="0.0001"
                        value={ppfRate}
                        onChange={(e) => setPpfRate(e.target.value)}
                        onBlur={handlePpfRateChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Örn: 0.05"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap w-24">
                        {isSavingPpfRate ? (
                          <span className="text-blue-500 animate-pulse">Kaydediliyor...</span>
                        ) : (
                          <span>Mevcut: {ppfRate}</span>
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Toplam Kar = (Hisse Karı * Ağırlık) + (Toplam Maliyet * PPF Oranı * (1 - Ağırlık))
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-green-600 flex items-center justify-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  En Çok Kazandıranlar (TL)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-muted-foreground border-b pb-2">
                  <span className="text-center">Hisse</span>
                  <span className="text-center">K/Z (TL)</span>
                  <span className="text-center">Fark %</span>
                  <span className="text-center">Etki %</span>
                </div>
                <div className="space-y-3">
                  {[...finalData]
                    .filter(item => item.profitTL !== undefined && !isNaN(item.profitTL) && item.profitTL > 0)
                    .sort((a, b) => b.profitTL - a.profitTL)
                    .slice(0, 5)
                    .map(item => {
                      const impactPercent = totalCost >
                        0 ? ((item.profitTL * multiplierVal) / totalCost) * 100
                        : 0;

                      return (
                        <div key={item.code} className="grid grid-cols-4 items-center text-xs sm:text-sm p-2 hover:bg-muted/50 rounded-md transition-colors gap-2">
                          <span className="font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis" title={item.code}>{item.code}</span>
                          <span className="font-mono font-medium text-green-600 text-center truncate">
                            +{formatCurrency(item.profitTL * multiplierVal)}
                          </span>
                          <span className="font-bold text-green-600 bg-green-50 dark:bg-green-900/10 px-1 py-0.5 rounded text-[9px] sm:text-xs text-center">
                            +%{formatNumber(Math.abs(item.returnRate), 2)}
                          </span>
                          <span className="font-mono font-medium text-muted-foreground text-center">
                            %{formatNumber(impactPercent, 2)}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Daily Return & Top Losers */}
          <div className="space-y-6">
            <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow h-[180px] flex flex-col justify-center">
              <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CardTitle className="text-sm font-medium">
                    Günlük Getiri
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex flex-col items-center">
                  <span className={cn("text-4xl font-bold", totalProfit >= 0 ? "text-green-600" : "text-red-600")}>
                    {totalProfit >= 0 ? '+' : ''}{formatPercent(totalReturnPercent)}
                  </span>
                  <span className="text-lg text-muted-foreground font-medium mt-2">
                    {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-red-600 flex items-center justify-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  En Çok Kaybettirenler (TL)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-semibold text-muted-foreground border-b pb-2">
                  <span className="text-center">Hisse</span>
                  <span className="text-center">K/Z (TL)</span>
                  <span className="text-center">Fark %</span>
                  <span className="text-center">Etki %</span>
                </div>
                <div className="space-y-3">
                  {[...finalData]
                    .filter(item => item.profitTL !== undefined && !isNaN(item.profitTL) && item.profitTL < 0)
                    .sort((a, b) => a.profitTL - b.profitTL)
                    .slice(0, 5)
                    .map(item => {
                      const impactPercent = totalCost > 0
                        ? ((item.profitTL * multiplierVal) / totalCost) * 100
                        : 0;

                      return (
                        <div key={item.code} className="grid grid-cols-4 items-center text-xs sm:text-sm p-2 hover:bg-muted/50 rounded-md transition-colors gap-2">
                          <span className="font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis" title={item.code}>{item.code}</span>
                          <span className={cn("font-mono font-medium text-center truncate", item.profitTL < 0 ? "text-red-600" : "text-gray-600")}>
                            {formatCurrency(item.profitTL * multiplierVal)}
                          </span>
                          <span className={cn("font-bold px-1 py-0.5 rounded text-[9px] sm:text-xs text-center",
                            item.returnRate < 0 ? "text-red-600 bg-red-50 dark:bg-red-900/10" : "text-gray-600 bg-gray-100")}>
                            %{formatNumber(Math.abs(item.returnRate), 2)}
                          </span>
                          <span className="font-mono font-medium text-muted-foreground text-center">
                            %{formatNumber(impactPercent, 2)}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <PortfolioTable
          data={sortedData}
          onDelete={isAdmin ? handleRemoveStock : undefined}
          onEdit={isAdmin ? handleEditStock : undefined}
          fundCode={fundCode}
        />

        <AddStockDialog
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingStock(null)
          }}
          onAdd={handleAddStock}
          editingStock={editingStock}
        />

        {isAdmin && (
          <Card className="mt-8 border-dashed border-2 border-yellow-500 bg-yellow-50/10">
            <CardHeader>
              <CardTitle className="text-sm text-yellow-600">Debug Info (Admin Only)</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-1">
              <p>Multiplier (State): {multiplier} ({typeof multiplier})</p>
              <p>Total Value: {totalValue}</p>
              <p>Total Cost: {totalCost}</p>
              <p>Total Profit: {totalProfit}</p>
              <p>PPF Rate: {ppfRate}</p>
              <p>Sample Impact Calculation (Top Gainer):</p>
              {finalData.length > 0 && (
                <p>
                  {finalData[0].code}: Profit={finalData[0].profitTL},
                  Impact=({finalData[0].profitTL} * {multiplier}) / {totalCost} * 100 =
                  {(finalData[0].profitTL * multiplier / totalCost * 100).toFixed(4)}%
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div >
    </div >
  )
}
