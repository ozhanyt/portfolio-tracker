/**
 * Market data service for fetching market indicators via Google Apps Script proxy
 * BIST100, USDTRY, XAUTRYG (Gold), BTCUSD
 */

// Persistent cache for market data
const CACHE_KEY = 'market_data_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes (via Google Apps Script)

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

        // Google Apps Script Proxy URL
        const url = `https://script.google.com/macros/s/AKfycbwbXQQVniEt-pGbhgCTMTrrnDOnx9Irx6H92wenanMyyw4GfWWn8Dxr23oRHUtDyEQq/exec?symbols=${symbols.join(',')}`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()

        const getQuote = (symbol) => data.find(q => q.code === symbol && q.success)

        const results = []

        // BIST100
        const bist = getQuote('XU100.IS')
        if (bist) {
            results.push({
                symbol: 'BIST100',
                price: bist.currentPrice,
                change: bist.currentPrice - bist.prevClose,
                changePercent: ((bist.currentPrice - bist.prevClose) / bist.prevClose) * 100
            })
        }

        // USDTRY
        const usd = getQuote('USDTRY=X')
        if (usd) {
            results.push({
                symbol: 'USDTRY',
                price: usd.currentPrice,
                change: usd.currentPrice - usd.prevClose,
                changePercent: ((usd.currentPrice - usd.prevClose) / usd.prevClose) * 100
            })
        }

        // BTCUSD
        const btc = getQuote('BTC-USD')
        if (btc) {
            results.push({
                symbol: 'BTCUSD',
                price: btc.currentPrice,
                change: btc.currentPrice - btc.prevClose,
                changePercent: ((btc.currentPrice - btc.prevClose) / btc.prevClose) * 100
            })
        }

        // Precious Metals Calculation (TRY per gram)
        if (usd) {
            const usdPrice = usd.currentPrice
            const usdPrev = usd.prevClose

            // Gold (XAUTRYG)
            const gold = getQuote('GC=F')
            if (gold) {
                const goldPerGram = gold.currentPrice / 31.1
                const goldTRY = goldPerGram * usdPrice

                const prevGoldPerGram = gold.prevClose / 31.1
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
                const silverPerGram = silver.currentPrice / 31.1
                const silverTRY = silverPerGram * usdPrice

                const prevSilverPerGram = silver.prevClose / 31.1
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
