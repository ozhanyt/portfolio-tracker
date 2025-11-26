/**
 * Yahoo Finance API service for fetching real-time stock prices
 * Now using Google Apps Script Proxy to bypass Vercel/Localhost restrictions
 */

// Helper to check if a symbol is a fund
function isFund(symbol) {
    return symbol.length === 3 || symbol.toUpperCase().includes('FON')
}

// Helper to extract the 3-letter fund code
function getFundCode(symbol) {
    if (symbol.length === 3) return symbol.toUpperCase()
    const parts = symbol.split(' ')
    if (parts.length > 0 && parts[0].length === 3) {
        return parts[0].toUpperCase()
    }
    return symbol.substring(0, 3).toUpperCase()
}

// Persistent cache using localStorage
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes to reduce quota usage
const CACHE_PREFIX = 'portfolio_cache_'

function getCachedPrice(symbol) {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + symbol)
        if (!item) return null

        const cached = JSON.parse(item)
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data
        }
        return null // Expired
    } catch (e) {
        return null
    }
}

function setCachedPrice(symbol, data) {
    try {
        const cacheItem = {
            timestamp: Date.now(),
            data
        }
        localStorage.setItem(CACHE_PREFIX + symbol, JSON.stringify(cacheItem))
    } catch (e) {
        // Ignore storage errors
    }
}

// Helper to get STALE cache (ignoring duration) if API fails
function getStalePrice(symbol) {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + symbol)
        if (!item) return null
        return JSON.parse(item).data
    } catch (e) {
        return null
    }
}

export async function fetchStockPrice(symbol, options = {}) {
    // Check if it's a fund
    if (!options.isForeign && isFund(symbol)) {
        const fundCode = getFundCode(symbol)
        return fetchFundPrice(fundCode, symbol)
    }

    // For single stock, just use the batch function with one symbol
    const results = await fetchStockPrices([symbol], options)
    return results[0] || { code: symbol, success: false, error: 'Not found' }
}

async function fetchFundPrice(code, originalSymbol) {
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://fintables.com/fonlar/${code}`)}`
        const response = await fetch(proxyUrl)

        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()
        const html = data.contents
        const priceMatch = html.match(/(\d+[.,]\d{6})/)

        if (!priceMatch) throw new Error('Price not found')

        const currentPrice = parseFloat(priceMatch[1].replace(',', '.'))

        return {
            code: originalSymbol || code,
            currentPrice: currentPrice,
            prevClose: currentPrice,
            success: true
        }
    } catch (error) {
        console.error(`Error fetching fund price for ${code}:`, error)
        return {
            code: originalSymbol || code,
            success: false,
            error: error.message
        }
    }
}

export async function fetchStockPrices(symbols, options = {}) {
    if (symbols.length === 0) return []

    // Check cache first
    const cachedResults = []
    const symbolsToFetch = []

    symbols.forEach(symbol => {
        const cached = getCachedPrice(symbol)
        if (cached) {
            cachedResults.push(cached)
        } else {
            symbolsToFetch.push(symbol)
        }
    })

    if (symbolsToFetch.length === 0) {
        return cachedResults
    }

    const fundSymbols = symbolsToFetch.filter(s => !options.isForeign && isFund(s))
    const stockSymbols = symbolsToFetch.filter(s => options.isForeign || !isFund(s))

    let results = []

    // Fetch Funds
    const fundPromises = fundSymbols.map(async symbol => {
        try {
            const data = await fetchStockPrice(symbol, options)
            if (data.success) setCachedPrice(symbol, data)
            return data
        } catch (e) {
            return { code: symbol, success: false, error: e.message }
        }
    })

    // Fetch Stocks (Batch via Google Apps Script Proxy)
    if (stockSymbols.length > 0) {
        try {
            const yahooSymbols = stockSymbols.map(s =>
                options.isForeign ? s : (s.endsWith('.IS') ? s : `${s}.IS`)
            )

            const symbolsParam = yahooSymbols.join(',')
            const url = `https://script.google.com/macros/s/AKfycbwbXQQVniEt-pGbhgCTMTrrnDOnx9Irx6H92wenanMyyw4GfWWn8Dxr23oRHUtDyEQq/exec?symbols=${symbolsParam}`

            const response = await fetch(url)

            if (response.ok) {
                const stockData = await response.json()

                const stockResults = stockSymbols.map(originalSymbol => {
                    const yahooSymbol = options.isForeign ? originalSymbol : (originalSymbol.endsWith('.IS') ? originalSymbol : `${originalSymbol}.IS`)
                    const quote = stockData.find(q => q.code === yahooSymbol && q.success)

                    if (quote) {
                        const result = {
                            code: originalSymbol,
                            currentPrice: quote.currentPrice,
                            prevClose: quote.prevClose,
                            success: true
                        }
                        setCachedPrice(originalSymbol, result)
                        return result
                    } else {
                        const stale = getStalePrice(originalSymbol)
                        if (stale) return stale

                        return {
                            code: originalSymbol,
                            success: false,
                            error: quote?.error || 'Not found in response'
                        }
                    }
                })
                results.push(...stockResults)
            } else {
                console.warn('Batch fetch failed:', response.statusText)
                const fallbackResults = stockSymbols.map(s => {
                    const stale = getStalePrice(s)
                    if (stale) return stale
                    return { code: s, success: false, error: `Batch fetch failed: ${response.status}` }
                })
                results.push(...fallbackResults)
            }
        } catch (error) {
            console.error('Batch fetch error:', error)
            const fallbackResults = stockSymbols.map(s => {
                const stale = getStalePrice(s)
                if (stale) return stale
                return { code: s, success: false, error: error.message }
            })
            results.push(...fallbackResults)
        }
    }

    const fundResults = await Promise.all(fundPromises)
    results = [...results, ...fundResults]

    return [...cachedResults, ...results].filter(r => r.success)
}

export async function fetchIntradayHistory(symbol, options = {}) {
    // Check if it's a fund
    if (!options.isForeign && isFund(symbol)) {
        try {
            const fundCode = getFundCode(symbol)
            const priceData = await fetchFundPrice(fundCode, symbol)
            if (!priceData.success) return { symbol, data: [] }

            // Synthetic history for funds
            const now = new Date()
            const start = new Date(now).setHours(10, 0, 0, 0)
            const end = new Date(now).setHours(18, 0, 0, 0)
            const data = []

            for (let t = start; t <= end; t += 5 * 60 * 1000) {
                if (t > now.getTime()) break
                data.push({
                    timestamp: t,
                    price: priceData.currentPrice
                })
            }

            return {
                symbol,
                prevClose: priceData.prevClose,
                data
            }
        } catch (e) {
            console.error(`Error generating history for fund ${symbol}:`, e)
            return { symbol, data: [] }
        }
    }

    // For stocks: Fetch real intraday data from Google Apps Script
    try {
        const yahooSymbol = options.isForeign ? symbol : (symbol.endsWith('.IS') ? symbol : `${symbol}.IS`)
        const interval = '5m'
        const range = options.isForeign ? '5d' : '1d'

        const url = `https://script.google.com/macros/s/AKfycbwbXQQVniEt-pGbhgCTMTrrnDOnx9Irx6H92wenanMyyw4GfWWn8Dxr23oRHUtDyEQq/exec?type=intraday&symbol=${yahooSymbol}&interval=${interval}&range=${range}`

        const response = await fetch(url)
        if (!response.ok) throw new Error(`API error: ${response.status}`)

        const data = await response.json()
        const result = data.chart?.result?.[0]

        if (!result) {
            return { symbol, data: [] }
        }

        const timestamps = result.timestamp
        const closes = result.indicators?.quote?.[0]?.close

        if (!timestamps || !closes) {
            return { symbol, data: [] }
        }

        const history = timestamps.map((t, i) => ({
            timestamp: t * 1000,
            price: closes[i]
        })).filter(item => item.price != null)

        return {
            symbol,
            prevClose: result.meta?.chartPreviousClose || result.meta?.previousClose,
            data: history
        }
    } catch (error) {
        console.error(`Error fetching history for ${symbol}:`, error)
        return { symbol, data: [] }
    }
}

export async function fetchUSDTRYRate() {
    // Using Google Apps Script Proxy for USDTRY as well
    try {
        const url = `https://script.google.com/macros/s/AKfycbwbXQQVniEt-pGbhgCTMTrrnDOnx9Irx6H92wenanMyyw4GfWWn8Dxr23oRHUtDyEQq/exec?type=intraday&symbol=TRY=X&interval=30m&range=5d`

        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const data = await response.json()
        const result = data.chart?.result?.[0]

        if (!result || !result.timestamp || !result.indicators.quote[0].close) {
            // Fallback to simple quote if chart fails
            const quoteUrl = `https://script.google.com/macros/s/AKfycbwbXQQVniEt-pGbhgCTMTrrnDOnx9Irx6H92wenanMyyw4GfWWn8Dxr23oRHUtDyEQq/exec?symbols=TRY=X`
            const quoteResponse = await fetch(quoteUrl)
            const quoteData = await quoteResponse.json()
            const quote = quoteData.find(q => q.code === 'TRY=X')
            if (quote && quote.success) {
                return { currentRate: quote.currentPrice, prevRate: quote.prevClose }
            }
            throw new Error("No data found for TRY=X")
        }

        const timestamps = result.timestamp
        const closes = result.indicators.quote[0].close

        // Group by day (same logic as before)
        const candlesByDay = {}
        timestamps.forEach((t, i) => {
            if (closes[i] === null) return
            const date = new Date(t * 1000)
            const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`

            if (!candlesByDay[dayKey]) candlesByDay[dayKey] = []
            candlesByDay[dayKey].push({
                time: {
                    hours: date.getUTCHours(),
                    minutes: date.getUTCMinutes()
                },
                price: closes[i],
                timestamp: t
            })
        })

        const sortedDays = Object.keys(candlesByDay).sort()
        const lastDayKey = sortedDays[sortedDays.length - 1]
        const currentDayCandles = candlesByDay[lastDayKey]

        const prevDayKey = sortedDays.length > 1 ? sortedDays[sortedDays.length - 2] : null
        const prevDayCandles = prevDayKey ? candlesByDay[prevDayKey] : null

        const currentTarget = currentDayCandles.find(c => c.time.hours === 12 && c.time.minutes === 30)
        const currentRate = currentTarget ? currentTarget.price : currentDayCandles[currentDayCandles.length - 1].price

        let prevRate = currentRate
        if (prevDayCandles) {
            const prevTarget = prevDayCandles.find(c => c.time.hours === 12 && c.time.minutes === 30)
            prevRate = prevTarget ? prevTarget.price : prevDayCandles[prevDayCandles.length - 1].price
        }

        return {
            currentRate,
            prevRate
        }

    } catch (error) {
        console.error("Error fetching USDTRY rate:", error)
        return {
            currentRate: 34.50,
            prevRate: 34.50
        }
    }
}
