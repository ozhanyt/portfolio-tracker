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
        const symbols = [
            'XU100.IS',     // BIST100
            'USDTRY=X',     // USD/TRY
            'BTC-USD',      // Bitcoin
            'GC=F',         // Gold Futures (per ounce)
            'SI=F'          // Silver Futures (per ounce)
        ]

        const url = `/api/yahoo/v7/finance/quote?symbols=${symbols.join(',')}`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        const quotes = data.quoteResponse?.result || []

        const getQuote = (symbol) => quotes.find(q => q.symbol === symbol)

        const results = []

        // BIST100
        const bist = getQuote('XU100.IS')
        if (bist) {
            results.push({
                symbol: 'BIST100',
                price: bist.regularMarketPrice,
                change: bist.regularMarketChange,
                changePercent: bist.regularMarketChangePercent
            })
        }

        // USDTRY
        const usd = getQuote('USDTRY=X')
        if (usd) {
            results.push({
                symbol: 'USDTRY',
                price: usd.regularMarketPrice,
                change: usd.regularMarketChange,
                changePercent: usd.regularMarketChangePercent
            })
        }

        // BTCUSD
        const btc = getQuote('BTC-USD')
        if (btc) {
            results.push({
                symbol: 'BTCUSD',
                price: btc.regularMarketPrice,
                change: btc.regularMarketChange,
                changePercent: btc.regularMarketChangePercent
            })
        }

        // Precious Metals Calculation (TRY per gram)
        if (usd) {
            const usdPrice = usd.regularMarketPrice
            const usdPrev = usd.regularMarketPreviousClose

            // Gold (XAUTRYG)
            const gold = getQuote('GC=F')
            if (gold) {
                const goldPerGram = gold.regularMarketPrice / 31.1
                const goldTRY = goldPerGram * usdPrice

                const prevGoldPerGram = gold.regularMarketPreviousClose / 31.1
                const prevGoldTRY = prevGoldPerGram * usdPrev

                results.push({
                    symbol: 'XAUTRYG',
                    price: goldTRY,
                    change: goldTRY - prevGoldTRY,
                    changePercent: ((goldTRY - prevGoldTRY) / prevGoldTRY) * 100
                })
            }

            // Silver (XAGTRYG)
            const silver = getQuote('SI=F')
            if (silver) {
                const silverPerGram = silver.regularMarketPrice / 31.1
                const silverTRY = silverPerGram * usdPrice

                const prevSilverPerGram = silver.regularMarketPreviousClose / 31.1
                const prevSilverTRY = prevSilverPerGram * usdPrev

                results.push({
                    symbol: 'XAGTRYG',
                    price: silverTRY,
                    change: silverTRY - prevSilverTRY,
                    changePercent: ((silverTRY - prevSilverTRY) / prevSilverTRY) * 100
                })
            }
        }

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
