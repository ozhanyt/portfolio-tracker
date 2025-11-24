/**
 * Market data service for fetching market indicators from serverless backend
 * BIST100, USDTRY, XAUTRYG (Gold), BTCUSD
 */

// Persistent cache for market data - AGGRESSIVE CACHE
const CACHE_KEY = 'market_data_cache'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function fetchMarketData() {
    // Check cache first
    try {
        const cachedItem = localStorage.getItem(CACHE_KEY)
        if (cachedItem) {
            const { timestamp, data } = JSON.parse(cachedItem)
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data
            }
        }
    } catch (e) {
        // Ignore cache errors
    }

    try {
        const url = `/api/market-data`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const results = await response.json()

        // Save to cache
        if (results.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: results
            }))
        }

        return results
    } catch (error) {
        console.error('Error fetching market data:', error)
        // Return stale cache if available
        try {
            const cachedItem = localStorage.getItem(CACHE_KEY)
            if (cachedItem) {
                return JSON.parse(cachedItem).data
            }
        } catch (e) { }
        return []
    }
}
