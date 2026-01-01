import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, TrendingUp, TrendingDown, Wallet, Plus, ArrowLeft, RefreshCw, Settings } from 'lucide-react'
import { PortfolioTable } from '@/components/PortfolioTable'
import { AddStockDialog } from '@/components/AddStockDialog'
import { UpdateLogoDialog } from '@/components/UpdateLogoDialog'
import { PortfolioAllocationChart } from '@/components/PortfolioAllocationChart'
import { formatCurrency, formatPercent, formatNumber, cn } from '@/lib/utils'
import { useStockPriceUpdates } from '@/hooks/useStockPriceUpdates'
import { getAllLogos } from '@/services/logoService'
import { marketDebugData } from '@/services/marketDataService'

import { subscribeToFund, updateFundHoldings, updateFundMultiplier, updateFundTotals, updateFundPpfRate, updateFundPpfWeight, updateFundGyfRate } from '../services/firestoreService'
import { useAdmin } from '@/contexts/AdminContext'

export function PortfolioDetailPage({ isDarkMode, setIsDarkMode }) {
  const { fundCode } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAdmin()

  const [fundData, setFundData] = useState(null)
  const [portfolio, setPortfolio] = useState([])
  const [multiplier, setMultiplier] = useState(1)
  const [ppfRate, setPpfRate] = useState(0)
  const [ppfWeight, setPpfWeight] = useState(null) // Null = Auto (1 - multiplier)
  const [gyfRate, setGyfRate] = useState(0)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingStock, setEditingStock] = useState(null)
  const [logoMap, setLogoMap] = useState({})
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false)
  const [selectedLogoStock, setSelectedLogoStock] = useState(null)

  const latestPricesRef = useRef({})
  const hasFreshDataRef = useRef(false) // Track if we have fresh local calculations

  // Helper to normalize stock codes (handle " FONU" suffix mismatch)
  const normalizeCode = (code) => {
    return String(code).trim().replace(/ FONU$/i, '').toUpperCase()
  }

  const handleUpdateLogo = (stock) => {
    setSelectedLogoStock(stock)
    setIsLogoDialogOpen(true)
  }

  const handleLogoSaved = async () => {
    // Refresh logos
    const logos = await getAllLogos()
    setLogoMap(logos)
  }

  // Fetch global logos on mount
  useEffect(() => {
    const fetchLogos = async () => {
      const logos = await getAllLogos()
      setLogoMap(logos)
    }
    fetchLogos()
  }, [])

  // Reset fresh data flag and clear portfolio when switching funds
  useEffect(() => {
    console.log(`🔄 FUND SWITCH → ${fundCode}`)
    hasFreshDataRef.current = false
    setPortfolio([]) // Force clean slate - prevents cross-fund data pollution
    latestPricesRef.current = {} // Clear price cache - critical for multi-fund support
  }, [fundCode])

  // Subscribe to fund data
  useEffect(() => {
    const unsubscribe = subscribeToFund(fundCode, (data) => {
      if (data) {
        console.log(`📥 FIRESTORE DATA for ${fundCode}:`, {
          holdingsCount: data.holdings?.length,
          firstHolding: data.holdings?.[0],
          firstHoldingDetails: `${data.holdings?.[0]?.code} x ${data.holdings?.[0]?.quantity}`,
          dstkf: data.holdings?.find(h => h.code === 'DSTKF'),
          totalValue: data.totalValue,
          totalProfit: data.totalProfit
        })
        setFundData(data)

        // Merge incoming Firestore holdings with locally cached prices
        // This prevents the UI from reverting to stale prices when Firestore updates (e.g. after saving totals)
        const mergedHoldings = (data.holdings || []).map(item => {
          // Try exact match first, then normalized match
          let cachedPrice = latestPricesRef.current[item.code]
          if (!cachedPrice) {
            const normalizedItemCode = normalizeCode(item.code)
            const matchKey = Object.keys(latestPricesRef.current).find(key => normalizeCode(key) === normalizedItemCode)
            if (matchKey) cachedPrice = latestPricesRef.current[matchKey]
          }

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

        // Only update portfolio if we don't have fresh local data
        // This prevents Firestore updates from overwriting fresh calculations
        if (!hasFreshDataRef.current) {
          console.log(`✅ APPLYING Firestore data for ${fundCode} (${mergedHoldings.length} holdings)`)
          setPortfolio(mergedHoldings)
        } else {
          console.log(`🛡️ SKIPPING Firestore update for ${fundCode} (has fresh data)`)
        }

        setMultiplier(data.multiplier || 1)
        setPpfRate(data.ppfRate || 0)
        setPpfWeight(data.ppfWeight !== undefined ? data.ppfWeight : null) // Allow null for default
        setGyfRate(data.gyfRate || 0)
      } else {
        // Fund not found
        navigate('/')
      }
    })
    return () => unsubscribe()
  }, [fundCode, navigate])

  // Auto-update stock prices
  // Auto-update stock prices
  const handlePriceUpdate = async (prices) => {
    // console.log(`💰 PRICE UPDATE for ${fundCode}:`, prices.length, 'prices')

    // CRITICAL: Filter to only use prices for current fund!
    // Normalize for case-insensitive comparison and trim whitespace
    const normalizedFundCode = fundCode.trim().toUpperCase()
    const fundPrices = prices.filter(p => {
      if (!p.fund) return true // Include prices without fund field (backwards compat)
      const normalizedPriceFund = String(p.fund).trim().toUpperCase()
      return normalizedPriceFund === normalizedFundCode
    })
    // console.log(`   🔍 Filtered to ${fundPrices.length} prices for fund ${fundCode}`)

    // Update the ref with FILTERED prices
    fundPrices.forEach(p => {
      latestPricesRef.current[p.code] = p
    })

    // Use functional update to ensure we work with the most recent state
    setPortfolio(currentPortfolio => {
      const newPortfolio = currentPortfolio.map(item => {
        // Try exact match first, then normalized match - USE FILTERED PRICES!
        let priceData = fundPrices.find(p => p.code === item.code)
        if (!priceData) {
          const normalizedItemCode = normalizeCode(item.code)
          priceData = fundPrices.find(p => normalizeCode(p.code) === normalizedItemCode)
        }

        if (priceData) {
          return {
            ...item,
            currentPrice: priceData.currentPrice,
            prevClose: priceData.prevClose,
            // DON'T sync quantity - price API returns multi-fund data!
            // quantity: priceData.quantity || item.quantity,
            cost: priceData.prevClose, // Sync cost with prevClose for daily tracking
            lastRolloverDate: priceData.lastRolloverDate || item.lastRolloverDate || null // Update rollover date if present
          }
        }
        return item
      })

      hasFreshDataRef.current = true // Mark that we have fresh local data
      return newPortfolio
    })
  }

  const { lastUpdate, isUpdating, error, rates } = useStockPriceUpdates(portfolio, handlePriceUpdate, fundCode, 60000)

  // Calculate portfolio values
  const calculatedPortfolio = portfolio.map(item => {
    let currentValue, totalCost, profitTL

    // Determine the currency and its rates
    const currency = item.currency || (item.isForeign ? 'USD' : 'TRY')
    const rateData = rates[currency] || { current: 1, prev: 1 }

    const currentRate = rateData.current
    const previousRate = rateData.prev

    if (currency !== 'TRY') {
      // Foreign Currency Calculation
      // Profit = (Current Price * Current Rate) - (Prev Close * Prev Rate)
      const currentPriceTL = item.currentPrice * currentRate
      const prevPriceTL = item.cost * previousRate // item.cost is synced with prevClose

      currentValue = currentPriceTL * item.quantity
      totalCost = prevPriceTL * item.quantity
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
      originalCurrency: currency
    }
  })

  const totalValue = calculatedPortfolio.reduce((sum, item) => sum + item.currentValue, 0)
  // Use the calculated totalCost which handles currency conversion
  const totalCost = calculatedPortfolio.reduce((sum, item) => sum + item.totalCost, 0)
  let totalProfit = totalValue - totalCost

  // Apply Multiplier and PPF Calculation
  // Total Profit = (Stock Profit * Multiplier) + (Total Cost * PPF Rate * (1 - Multiplier))

  // Ensure multiplier is a number (Handle Turkish comma)
  const parseTurkishFloat = (val) => {
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      return parseFloat(val.replace(',', '.'))
    }
    return 0
  }

  const multiplierVal = parseTurkishFloat(multiplier) || 0
  const ppfRateVal = parseTurkishFloat(ppfRate) || 0
  const ppfWeightVal = ppfWeight !== null ? parseTurkishFloat(ppfWeight) : (1 - (multiplierVal || 1))
  const gyfRateVal = parseTurkishFloat(gyfRate) || 0

  if (multiplierVal) {
    const stockWeight = multiplierVal
    const explicitPpfWeight = ppfWeightVal

    // Remaining weight goes to GYF
    // Formula: Total - Stock - PPF
    const gyfWeight = Math.max(0, 1 - stockWeight - explicitPpfWeight)

    const stockProfit = totalProfit // Raw stock profit from previous calc
    const ppfProfit = totalCost * ppfRateVal * explicitPpfWeight
    const gyfProfit = totalCost * gyfRateVal * gyfWeight

    // Total Profit = (Stock Profit * Stock Weight) + (Cost * PPF Rate * PPF Weight) + (Cost * GYF Rate * GYF Weight)
    totalProfit = (stockProfit * stockWeight) + ppfProfit + gyfProfit
  }

  const totalReturnPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

  // Sync totals to Firestore for Overview Page
  const isSyncingRef = useRef(false)

  useEffect(() => {
    // Skip if portfolio is empty (fund switch in progress)
    if (!portfolio || portfolio.length === 0) {
      console.log(`⏭️ Skipping totals update - portfolio empty for ${fundCode}`)
      return
    }

    const now = Date.now()
    const STORAGE_KEY = `last_fund_update_${fundCode}`
    const lastUpdate = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    const timeSinceLastUpdate = now - lastUpdate
    const MIN_UPDATE_INTERVAL = 30 * 1000 // 30 seconds throttle

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
      console.log(`💾 Auto-saving totals for ${fundCode}`, { totalValue, totalProfit })
      isSyncingRef.current = true

      // Update storage immediately to prevent other tabs/reloads from triggering
      localStorage.setItem(STORAGE_KEY, now.toString())

      // Ensure no NaN/Infinity values are sent to Firestore
      const safePayload = {
        totalValue: Number.isFinite(totalValue) ? totalValue : 0,
        totalProfit: Number.isFinite(totalProfit) ? totalProfit : 0,
        returnRate: Number.isFinite(totalReturnPercent) ? totalReturnPercent : 0
      }

      // Also save the current portfolio (holdings) to persist updated prices
      updateFundTotals(fundCode, safePayload, portfolio).catch(console.error)
        .finally(() => {
          isSyncingRef.current = false
        })
    }
  }, [totalValue, totalProfit, totalReturnPercent, fundData, fundCode, portfolio])



  // Add weights and map for table display
  const finalData = calculatedPortfolio.map(item => ({
    ...item,
    weight: totalValue > 0 ? ((item.currentValue / totalValue) * 100) : 0,
    value: item.currentValue, // Alias for table
    profit: item.profitTL * multiplierVal,    // Alias for table (Apply multiplier here!)
    logoUrl: logoMap[item.code] || item.logoUrl // Use global logo if available
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
  const [isSavingPpfWeight, setIsSavingPpfWeight] = useState(false)
  const [isSavingGyfRate, setIsSavingGyfRate] = useState(false)

  const handleMultiplierChange = async (e) => {
    // If triggered by onBlur, e.target.value is used.
    // If triggered by Enter key (optional), same.
    let valStr = String(multiplier).replace(',', '.')
    const val = parseFloat(valStr)

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
    let valStr = String(ppfRate).replace(',', '.')
    const val = parseFloat(valStr)

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

  const handlePpfWeightChange = async (e) => {
    let valStr = String(ppfWeight).replace(',', '.')
    const val = parseFloat(valStr)

    if (isNaN(val)) return

    setIsSavingPpfWeight(true)
    try {
      await updateFundPpfWeight(fundCode, val)
    } catch (error) {
      console.error("Error saving PPF Weight:", error)
      alert("PPF Ağırlığı kaydedilemedi!")
    } finally {
      setIsSavingPpfWeight(false)
    }
  }

  const handleGyfRateChange = async (e) => {
    let valStr = String(gyfRate).replace(',', '.')
    const val = parseFloat(valStr)

    if (isNaN(val)) return

    setIsSavingGyfRate(true)
    try {
      await updateFundGyfRate(fundCode, val)
    } catch (error) {
      console.error("Error saving GYF Rate:", error)
      alert("GYF Oranı kaydedilemedi!")
    } finally {
      setIsSavingGyfRate(false)
    }
  }

  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncFromSheet = async () => {
    console.log(`🔵 SYNC START for fund: ${fundCode}`)
    if (!confirm("Google Sheet'ten tüm hisse listesini çekmek üzeresiniz. Mevcut listeniz güncellenecektir. Onaylıyor musunuz?")) return

    setIsSyncing(true)
    try {
      // Import dynamically to avoid circular dependency issues if any
      const { fetchFundHoldings } = await import('@/services/stockPriceService')
      console.log(`📡 Fetching holdings for: ${fundCode}`)
      const sheetHoldings = await fetchFundHoldings(fundCode)

      console.log(`📥 SHEET DATA received for ${fundCode}:`, sheetHoldings.length, 'holdings')
      console.log(`   First holding:`, sheetHoldings[0])
      console.log(`   DSTKF in sheet:`, sheetHoldings.find(h => h.code === 'DSTKF'))

      if (sheetHoldings.length === 0) {
        alert("Sheet'ten veri çekilemedi veya liste boş.")
        return
      }

      // DON'T merge - Use fresh sheet data directly with only flags preserved
      const mergedHoldings = sheetHoldings.map(sheetItem => {
        const existingItem = portfolio.find(p => p.code === sheetItem.code)
        // Only preserve user-set flags, everything else comes from sheet
        return {
          ...sheetItem,
          isForeign: existingItem?.isForeign ?? false,
          isManual: existingItem?.isManual ?? false,
          lastRolloverDate: existingItem?.lastRolloverDate ?? null
        }
      })

      console.log(`🔄 MERGED DATA for ${fundCode}:`, mergedHoldings.length, 'holdings')
      console.log(`   First merged:`, mergedHoldings[0])
      console.log(`   DSTKF merged:`, mergedHoldings.find(h => h.code === 'DSTKF'))

      // Update Firestore - Don't send totalValue/totalProfit as they will be recalculated
      // from the new holdings after the page reloads
      console.log(`💾 SAVING to Firestore for fund: ${fundCode}`)
      await updateFundHoldings(fundCode, mergedHoldings)
      console.log(`✅ SAVED successfully to Firestore for: ${fundCode}`)

      alert(`${mergedHoldings.length} hisse başarıyla güncellendi. Sayfa yenilenecek.`)
      // Force reload to recalculate totals with new holdings
      window.location.reload()

    } catch (error) {
      console.error("❌ Sync error:", error)
      alert("Senkronizasyon sırasında hata oluştu: " + error.message)
    } finally {
      setIsSyncing(false)
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

            {/* Header simplified as per user request */}

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
              <div className="flex gap-2">
                <button
                  onClick={handleSyncFromSheet}
                  disabled={isSyncing}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  title="Google Sheet'ten hisse listesini çek"
                >
                  <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="font-medium hidden sm:inline">Sheet'ten Çek</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium hidden sm:inline">Hisse Ekle</span>
                </button>
              </div>
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

                  {/* PPF Weight Input */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">PPF Ağırlığı (Opsiyonel)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        step="0.0001"
                        value={ppfWeight !== null ? ppfWeight : (1 - multiplierVal).toFixed(4)}
                        onChange={(e) => setPpfWeight(e.target.value)}
                        onBlur={handlePpfWeightChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Örn: 0.20"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap w-24">
                        {isSavingPpfWeight ? (
                          <span className="text-blue-500 animate-pulse">Kaydediliyor...</span>
                        ) : (
                          <span>Mevcut: {ppfWeight !== null ? ppfWeight : 'Oto'}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* GYF Rate Input */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">GYF Oranı (Getiri)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        step="0.0001"
                        value={gyfRate}
                        onChange={(e) => setGyfRate(e.target.value)}
                        onBlur={handleGyfRateChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Örn: 0.10"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap w-24">
                        {isSavingGyfRate ? (
                          <span className="text-blue-500 animate-pulse">Kaydediliyor...</span>
                        ) : (
                          <span>Mevcut: {gyfRate}</span>
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      GYF Ağırlığı = 1 - Hisse Ağırlığı - PPF Ağırlığı
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
                            +{formatCurrency(item.profitTL * multiplierVal, 0)}
                          </span>
                          <span className="font-bold text-green-600 bg-green-50 dark:bg-green-900/10 px-1 py-0.5 rounded text-[9px] sm:text-xs text-center">
                            +%{formatNumber(Math.abs(item.returnRate), 2)}
                          </span>
                          <span className="font-mono font-medium text-muted-foreground text-center">
                            %{Math.abs(impactPercent) < 0.01 && impactPercent !== 0 ? formatNumber(impactPercent, 4) : formatNumber(impactPercent, 2)}
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
                            {formatCurrency(item.profitTL * multiplierVal, 0)}
                          </span>
                          <span className={cn("font-bold px-1 py-0.5 rounded text-[9px] sm:text-xs text-center",
                            item.returnRate < 0 ? "text-red-600 bg-red-50 dark:bg-red-900/10" : "text-gray-600 bg-gray-100")}>
                            %{formatNumber(Math.abs(item.returnRate), 2)}
                          </span>
                          <span className="font-mono font-medium text-muted-foreground text-center">
                            %{Math.abs(impactPercent) < 0.01 && impactPercent !== 0 ? formatNumber(impactPercent, 4) : formatNumber(impactPercent, 2)}
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
          onUpdateLogo={isAdmin ? handleUpdateLogo : undefined}
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


        <UpdateLogoDialog
          isOpen={isLogoDialogOpen}
          onClose={() => setIsLogoDialogOpen(false)}
          stock={selectedLogoStock}
          onSave={handleLogoSaved}
        />

      </div >
    </div >
  )
}
