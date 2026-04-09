import { useEffect, useState, useRef } from 'react'
import { fetchStockPrices, fetchExchangeRates, fetchFundHoldings } from '@/services/stockPriceService'

/**
 * Hook to automatically update stock prices at regular intervals
 * @param {Array} portfolio - Current portfolio data
 * @param {Function} onUpdate - Callback function to update prices
 * @param {string} fundCode - Optional fund code. If provided, fetches data specific to that fund.
 * @param {number} intervalMs - Update interval in milliseconds (default: 300000 = 5 minutes)
 */
export function useStockPriceUpdates(portfolio, onUpdate, fundCode, intervalMs = 900000) {
    const [lastUpdate, setLastUpdate] = useState(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [error, setError] = useState(null)
    const [rates, setRates] = useState({
        USD: { current: 38.00, prev: 38.00 },
        EUR: { current: 40.00, prev: 40.00 },
        CHF: { current: 42.00, prev: 42.00 },
        CAD: { current: 27.00, prev: 27.00 },
        DKK: { current: 5.50, prev: 5.50 },
        NOK: { current: 3.50, prev: 3.50 },
        GBP: { current: 48.00, prev: 48.00 },
        TRY: { current: 1, prev: 1 }
    })
    const updateTimeoutRef = useRef(null)
    // Create a key that changes only when codes or isManual/isForeign flags change
    const portfolioKey = portfolio.map(p => `${p.code}-${p.isManual}-${p.isForeign}`).join('|')

    // Fetch Rates on mount and periodically
    useEffect(() => {
        const fetchRates = async () => {
            if (typeof document !== 'undefined' && document.hidden) {
                return
            }
            const exchangeRates = await fetchExchangeRates()
            setRates(exchangeRates)
        }
        fetchRates()
        // Fetch rates every 5 minutes
        const rateInterval = setInterval(fetchRates, 300000)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchRates()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(rateInterval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    useEffect(() => {
        if (!portfolio || portfolio.length === 0) {
            return
        }

        const updatePrices = async () => {
            if (typeof document !== 'undefined' && document.hidden) {
                return
            }

            setIsUpdating(true)
            setError(null)

            try {
                let allPrices = []
                let hasSymbolsToFetch = false

                // STRATEGY 1: If fundCode is provided, fetch ALL holdings for that fund
                if (fundCode) {
                    // console.log(`📡 Fetching price updates via fetchFundHoldings for ${fundCode}`)
                    const fundHoldings = await fetchFundHoldings(fundCode)
                    allPrices = fundHoldings
                    hasSymbolsToFetch = true
                }
                // STRATEGY 2: If no fundCode (e.g. Overview page), fetch by symbols
                else {
                    // Separate local and foreign stocks
                    const localSymbols = [...new Set(portfolio
                        .filter(item => !item.isManual && !item.isForeign)
                        .map(item => item.code)
                    )]

                    const foreignSymbols = [...new Set(portfolio
                        .filter(item => !item.isManual && item.isForeign)
                        .map(item => item.code)
                    )]

                    hasSymbolsToFetch = localSymbols.length > 0 || foreignSymbols.length > 0

                    // Fetch local stocks
                    if (localSymbols.length > 0) {
                        const localPrices = await fetchStockPrices(localSymbols)
                        allPrices = [...allPrices, ...localPrices]
                    }

                    // Fetch foreign stocks
                    if (foreignSymbols.length > 0) {
                        const foreignPrices = await fetchStockPrices(foreignSymbols, { isForeign: true })
                        allPrices = [...allPrices, ...foreignPrices]
                    }
                }

                if (allPrices.length > 0) {
                    onUpdate(allPrices)
                    setLastUpdate(new Date())
                } else if (hasSymbolsToFetch) {
                    setError('Fiyat güncellenemedi')
                }
            } catch (err) {
                console.error('Price update error:', err)
                setError(err.message)
            } finally {
                setIsUpdating(false)
            }
        }

        // Initial update - IMMEDIATE
        updatePrices()

        // Set up interval for periodic updates
        const interval = setInterval(updatePrices, intervalMs)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                updatePrices()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Cleanup
        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [portfolioKey, intervalMs]) // Re-run only if portfolio or interval changes

    return {
        lastUpdate,
        isUpdating,
        error,
        rates
    }
}
