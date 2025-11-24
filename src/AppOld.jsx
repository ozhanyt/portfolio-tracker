
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react'
import { PortfolioTable } from '@/components/PortfolioTable'
import { AddStockDialog } from '@/components/AddStockDialog'
import { portfolioData as initialData } from '@/data/mockData'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'

function App() {
  // Initialize state from localStorage or fallback to mock data
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('portfolio')
    return saved ? JSON.parse(saved) : initialData
  })

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingStock, setEditingStock] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  // Save to localStorage whenever portfolio changes
  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify(portfolio))
  }, [portfolio])

  // Handle dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Calculate derived data
  const calculatedPortfolio = portfolio.map(item => {
    const currentValue = item.quantity * item.currentPrice
    const totalCost = item.quantity * item.cost
    const profitTL = currentValue - totalCost
    // Fark % = (Fiyat x Adet) / (Maliyet x Adet) - 1
    const changePercent = totalCost > 0 ? (currentValue / totalCost - 1) : 0
    return {
      ...item,
      currentValue,
      profitTL,
      changePercent
    }
  })

  const totalValue = calculatedPortfolio.reduce((sum, item) => sum + item.currentValue, 0)
  const totalCost = calculatedPortfolio.reduce((sum, item) => sum + (item.quantity * item.cost), 0)
  const totalProfit = totalValue - totalCost
  const dailyReturnPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

  // Add weights - Ağırlık = Portföy Değeri / Toplam Portföy Değeri * 100 (not -1, that would be negative)
  const finalData = calculatedPortfolio.map(item => ({
    ...item,
    weight: totalValue > 0 ? ((item.currentValue / totalValue) * 100) : 0
  }))

  const sortedData = [...finalData].sort((a, b) => b.weight - a.weight)

  const topGainer = [...finalData].sort((a, b) => b.profitTL - a.profitTL)[0] || { code: '-', profitTL: 0, changePercent: 0 }

  const handleAddStock = (newStock) => {
    if (editingStock) {
      // Update existing stock
      setPortfolio(prev => prev.map(p => p.code === editingStock.code ? {
        ...newStock,
        code: editingStock.code // Keep the original code
      } : p))
      setEditingStock(null)
    } else {
      // Add new stock
      setPortfolio(prev => {
        const existing = prev.find(p => p.code === newStock.code)
        if (existing) {
          const totalQty = existing.quantity + newStock.quantity
          const totalCost = (existing.quantity * existing.cost) + (newStock.quantity * newStock.cost)
          const avgCost = totalCost / totalQty

          return prev.map(p => p.code === newStock.code ? {
            ...p,
            quantity: totalQty,
            cost: avgCost,
            prevClose: avgCost, // Keep in sync
            currentPrice: newStock.currentPrice
          } : p)
        }
        return [...prev, newStock]
      })
    }
  }

  const handleEditStock = (stock) => {
    setEditingStock(stock)
    setIsAddModalOpen(true)
  }

  const handleRemoveStock = (code) => {
    if (confirm(`${code} hissesini silmek istediğinize emin misiniz?`)) {
      setPortfolio(prev => prev.filter(item => item.code !== code))
    }
  }

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Portföy Takip</h1>
            <p className="text-muted-foreground mt-1">Yatırımlarınızı takip edin</p>
          </div>
          <div className="flex gap-3">
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
                  <span className="text-sm font-medium">Light</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                  <span className="text-sm font-medium">Dark</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Hisse Ekle</span>
            </button>
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
                <div className="text-4xl font-bold tracking-tight">{formatCurrency(totalValue)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tüm varlıkların güncel toplamı
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-green-600 flex items-center justify-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  En Çok Kazandıranlar (TL)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...finalData]
                    .filter(item => item.profitTL !== undefined && !isNaN(item.profitTL) && item.profitTL > 0)
                    .sort((a, b) => b.profitTL - a.profitTL)
                    .slice(0, 5)
                    .map(item => (
                      <div key={item.code} className="flex justify-between items-center text-sm p-2 hover:bg-muted/50 rounded-md transition-colors">
                        <span className="font-bold w-24 text-left whitespace-nowrap overflow-hidden text-ellipsis" title={item.code}>{item.code}</span>
                        <span className="font-mono font-medium text-green-600 flex-1 text-center px-4">
                          +{formatCurrency(item.profitTL)}
                        </span>
                        <span className="font-bold text-green-600 bg-green-50 dark:bg-green-900/10 px-2 py-0.5 rounded text-xs w-16 text-right">
                          +{formatPercent(item.changePercent * 100)}
                        </span>
                      </div>
                    ))}
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
                    Toplam Getiri
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex flex-col items-center">
                  <span className={cn("text-4xl font-bold", totalProfit >= 0 ? "text-green-600" : "text-red-600")}>
                    {totalProfit >= 0 ? '+' : ''}{formatPercent(dailyReturnPercent)}
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
                <div className="space-y-3">
                  {[...finalData]
                    .filter(item => item.profitTL !== undefined && !isNaN(item.profitTL) && item.profitTL < 0)
                    .sort((a, b) => a.profitTL - b.profitTL)
                    .slice(0, 5)
                    .map(item => (
                      <div key={item.code} className="flex justify-between items-center text-sm p-2 hover:bg-muted/50 rounded-md transition-colors">
                        <span className="font-bold w-24 text-left whitespace-nowrap overflow-hidden text-ellipsis" title={item.code}>{item.code}</span>
                        <span className={cn("font-mono font-medium flex-1 text-center px-4", item.profitTL < 0 ? "text-red-600" : "text-gray-600")}>
                          {formatCurrency(item.profitTL)}
                        </span>
                        <span className={cn("font-bold px-2 py-0.5 rounded text-xs w-16 text-right",
                          item.changePercent < 0 ? "text-red-600 bg-red-50 dark:bg-red-900/10" : "text-gray-600 bg-gray-100")}>
                          {formatPercent(item.changePercent * 100)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <PortfolioTable data={sortedData} onDelete={handleRemoveStock} onEdit={handleEditStock} />

        <AddStockDialog
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingStock(null)
          }}
          onAdd={handleAddStock}
          editingStock={editingStock}
        />
      </div >
    </div >
  )
}

export default App

