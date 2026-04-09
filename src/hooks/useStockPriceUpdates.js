import { useEffect, useState } from 'react'
import { fetchStockPrices, fetchExchangeRates, fetchFundHoldings } from '@/services/stockPriceService'

const HIDDEN_POLL_MS = 5 * 60 * 1000

/**
 * Hook to automatically update stock prices at regular intervals
 * @param {Array} portfolio - Current portfolio data
 * @param {Function} onUpdate - Callback function to update prices
 * @param {string} fundCode - Optional fund code. If provided, fetches data specific to that fund.
 * @param {number} intervalMs - Visible-tab refresh interval in milliseconds.
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

    const portfolioKey = portfolio.map(p => `${p.code}-${p.isManual}-${p.isForeign}`).join('|')

    const getCurrentInterval = () => {
        if (typeof document !== 'undefined' && document.hidden) {
            return HIDDEN_POLL_MS
        }
        return intervalMs
    }

    useEffect(() => {
        let timeoutId = null
        let cancelled = false

        const fetchRates = async () => {
            try {
                const exchangeRates = await fetchExchangeRates()
                if (!cancelled) {
                    setRates(exchangeRates)
                }
            } finally {
                if (!cancelled) {
                    timeoutId = setTimeout(fetchRates, getCurrentInterval())
                }
            }
        }

        const handleVisibilityChange = () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (!document.hidden) {
                fetchRates()
            } else {
                timeoutId = setTimeout(fetchRates, getCurrentInterval())
            }
        }

        fetchRates()
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            cancelled = true
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [intervalMs])

    useEffect(() => {
        if (!portfolio || portfolio.length === 0) {
            return
        }

        let timeoutId = null
        let cancelled = false

        const updatePrices = async () => {
            setIsUpdating(true)
            setError(null)

            try {
                let allPrices = []
                let hasSymbolsToFetch = false

                if (fundCode) {
                    const fundHoldings = await fetchFundHoldings(fundCode)
                    allPrices = fundHoldings
                    hasSymbolsToFetch = true
                } else {
                    const localSymbols = [...new Set(portfolio
                        .filter(item => !item.isManual && !item.isForeign)
                        .map(item => item.code)
                    )]

                    const foreignSymbols = [...new Set(portfolio
                        .filter(item => !item.isManual && item.isForeign)
                        .map(item => item.code)
                    )]

                    hasSymbolsToFetch = localSymbols.length > 0 || foreignSymbols.length > 0

                    if (localSymbols.length > 0) {
                        const localPrices = await fetchStockPrices(localSymbols)
                        allPrices = [...allPrices, ...localPrices]
                    }

                    if (foreignSymbols.length > 0) {
                        const foreignPrices = await fetchStockPrices(foreignSymbols, { isForeign: true })
                        allPrices = [...allPrices, ...foreignPrices]
                    }
                }

                if (allPrices.length > 0) {
                    onUpdate(allPrices)
                    setLastUpdate(new Date())
                } else if (hasSymbolsToFetch) {
                    setError('Fiyat guncellenemedi')
                }
            } catch (err) {
                console.error('Price update error:', err)
                setError(err.message)
            } finally {
                setIsUpdating(false)
                if (!cancelled) {
                    timeoutId = setTimeout(updatePrices, getCurrentInterval())
                }
            }
        }

        const handleVisibilityChange = () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (!document.hidden) {
                updatePrices()
            } else {
                timeoutId = setTimeout(updatePrices, getCurrentInterval())
            }
        }

        updatePrices()
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            cancelled = true
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [portfolioKey, intervalMs, fundCode])

    return {
        lastUpdate,
        isUpdating,
        error,
        rates
    }
}
