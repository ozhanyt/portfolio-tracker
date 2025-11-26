import { useEffect, useState, useRef } from 'react'
import { fetchStockPrices, fetchUSDTRYRate } from '@/services/stockPriceService'

/**
 * Hook to automatically update stock prices at regular intervals
 * @param {Array} portfolio - Current portfolio data
 * @param {Function} onUpdate - Callback function to update prices
 * @param {number} intervalMs - Update interval in milliseconds (default: 300000 = 5 minutes)
 */
export function useStockPriceUpdates(portfolio, onUpdate, intervalMs = 900000) {
    const [lastUpdate, setLastUpdate] = useState(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [error, setError] = useState(null)
    const [usdRate, setUsdRate] = useState(null)
    const [prevUsdRate, setPrevUsdRate] = useState(null)
    const updateTimeoutRef = useRef(null)
    // Create a key that changes only when codes or isManual/isForeign flags change
    const portfolioKey = portfolio.map(p => `${p.code}-${p.isManual}-${p.isForeign}`).join('|')

    // Fetch USD Rate on mount and periodically
    useEffect(() => {
        const fetchRate = async () => {
            // Fetch USD Rate from Yahoo (15:30 snapshot or latest)
            const rates = await fetchUSDTRYRate()
            if (rates && rates.currentRate) {
                setUsdRate(rates.currentRate)
                setPrevUsdRate(rates.prevRate)
            }
        }
        fetchRate()
        // Fetch rate every hour
        const rateInterval = setInterval(fetchRate, 3600000)
        return () => clearInterval(rateInterval)
    }, [])

    useEffect(() => {
        if (!portfolio || portfolio.length === 0) {
            return
        }

        const updatePrices = async () => {
            setIsUpdating(true)
            setError(null)

            try {
                // Separate local and foreign stocks
                const localSymbols = [...new Set(portfolio
                    .filter(item => !item.isManual && !item.isForeign)
                    .map(item => item.code)
                )]

                const foreignSymbols = [...new Set(portfolio
                    .filter(item => !item.isManual && item.isForeign)
                    .map(item => item.code)
                )]

                let allPrices = []

                // Fetch local stocks
                if (localSymbols.length > 0) {
                    const localPrices = await fetchStockPrices(localSymbols)
                    allPrices = [...allPrices, ...localPrices]
                }

                // Fetch foreign stocks
                if (foreignSymbols.length > 0) {
                    const foreignPrices = await fetchStockPrices(foreignSymbols, { isForeign: true })

                    // Process Rollover Logic for Foreign Stocks
                    const now = new Date()
                    const isAfter1500 = now.getHours() >= 15
                    const todayStr = now.toISOString().split('T')[0]

                    const processedForeignPrices = foreignPrices.map(priceData => {
                        const portfolioItem = portfolio.find(p => p.code === priceData.code)
                        if (!portfolioItem) return priceData

                        // Check if rollover is needed
                        // If it's after 15:00 AND last rollover was NOT today
                        if (isAfter1500 && portfolioItem.lastRolloverDate !== todayStr) {
                            return {
                                ...priceData,
                                prevClose: priceData.currentPrice, // Set prevClose to currentPrice
                                lastRolloverDate: todayStr // Update rollover date
                            }
                        }

                        return priceData
                    })

                    allPrices = [...allPrices, ...processedForeignPrices]
                }

                if (allPrices.length > 0) {
                    onUpdate(allPrices)
                    setLastUpdate(new Date())
                } else if (localSymbols.length > 0 || foreignSymbols.length > 0) {
                    setError('Fiyat güncellenemedi')
                }
            } catch (err) {
                console.error('Price update error:', err)
                setError(err.message)
            } finally {
                setIsUpdating(false)
            }
        }

        // Initial update
        updatePrices()

        // Set up interval for periodic updates
        updateTimeoutRef.current = setInterval(updatePrices, intervalMs)

        // Cleanup
        return () => {
            if (updateTimeoutRef.current) {
                clearInterval(updateTimeoutRef.current)
            }
        }
    }, [portfolioKey, intervalMs, usdRate]) // Re-run if portfolio or rate changes

    return {
        lastUpdate,
        isUpdating,
        error,
        usdRate,
        prevUsdRate
    }
}
