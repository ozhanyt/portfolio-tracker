/**
 * Yahoo Finance API service for fetching real-time stock prices
 */

// Helper to check if a symbol is a fund
function isFund(symbol) {
    // It's a fund if it's exactly 3 letters OR contains "FON" (case insensitive)
    return symbol.length === 3 || symbol.toUpperCase().includes('FON')
}

// Helper to extract the 3-letter fund code
function getFundCode(symbol) {
    // If it's 3 letters, return as is
    if (symbol.length === 3) return symbol.toUpperCase()

    // If it contains space (e.g. "T3B FONU"), take the first part
    const parts = symbol.split(' ')
    if (parts.length > 0 && parts[0].length === 3) {
        return parts[0].toUpperCase()
    }

    // Fallback: try to find a 3-letter sequence at the start
    return symbol.substring(0, 3).toUpperCase()
}

// Persistent cache using localStorage - AGGRESSIVE CACHE
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
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
    // Check if it's a fund (ONLY if not explicitly marked as foreign)
    if (!options.isForeign && isFund(symbol)) {
        const fundCode = getFundCode(symbol)
        return fetchFundPrice(fundCode, symbol) // Pass original symbol to keep consistency
    }

    try {
        // Yahoo Finance API endpoint
        // If isForeign is true, use symbol as is. Otherwise, append .IS for Turkish stocks
        const yahooSymbol = options.isForeign ? symbol : (symbol.endsWith('.IS') ? symbol : `${symbol}.IS`)

        // For foreign stocks, we need specific time (10:30 AM EST) prices.
        // For local stocks, we use 5d range to correctly identify Previous Close (Friday) vs Current (Monday)
        const interval = options.isForeign ? '30m' : '1d'
        const range = '5d' // Always use 5d to have context

        const url = `/api/yahoo/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}&t=${Date.now()}`

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Extract price data
        const result = data.chart.result[0]
        const meta = result.meta
        const timestamps = result.timestamp
        const closes = result.indicators.quote[0].close

        let currentPrice = meta.regularMarketPrice
        let prevClose = meta.previousClose || meta.chartPreviousClose

        // Special logic for Foreign Stocks: Get price at 10:30 AM EST
        if (options.isForeign && timestamps && closes) {
            // ... (Existing Foreign Logic - Keeping it as is, just wrapped in the if)
            // Actually, I need to preserve the foreign logic exactly.
            // The user didn't complain about foreign stocks here, only Turkish ones.
            // So I will copy the foreign logic back.
            const gmtOffset = meta.gmtoffset || -18000
            const getExchangeTime = (timestamp) => {
                const date = new Date((timestamp + gmtOffset) * 1000)
                return {
                    day: date.getUTCDate(),
                    month: date.getUTCMonth(),
                    year: date.getUTCFullYear(),
                    hours: date.getUTCHours(),
                    minutes: date.getUTCMinutes(),
                    fullDate: date
                }
            }

            const candlesByDay = {}
            timestamps.forEach((t, i) => {
                if (closes[i] === null) return
                const time = getExchangeTime(t)
                const dayKey = `${time.year}-${time.month}-${time.day}`
                if (!candlesByDay[dayKey]) candlesByDay[dayKey] = []
                candlesByDay[dayKey].push({ time, price: closes[i], timestamp: t })
            })

            const sortedDays = Object.keys(candlesByDay).sort()
            const lastDayKey = sortedDays[sortedDays.length - 1]
            const prevDayKey = sortedDays[sortedDays.length - 2]

            const findTargetPrice = (dayKey) => {
                if (!dayKey || !candlesByDay[dayKey]) return null
                const dayCandles = candlesByDay[dayKey]
                const target = dayCandles.find(c => c.time.hours === 10 && c.time.minutes === 30)
                if (target) return target.price
                return dayCandles[dayCandles.length - 1].price
            }

            if (prevDayKey) {
                const pClose = findTargetPrice(prevDayKey)
                if (pClose) prevClose = pClose
            }
            if (lastDayKey) {
                const today1030 = findTargetPrice(lastDayKey)
                if (today1030) currentPrice = today1030
            }
        }
        // Logic for Local Stocks (Daily Interval)
        else if (!options.isForeign && timestamps && closes) {
            // Filter nulls
            const validCandles = timestamps.map((t, i) => ({ timestamp: t, price: closes[i] })).filter(c => c.price !== null)

            if (validCandles.length > 0) {
                const lastCandle = validCandles[validCandles.length - 1]
                const lastDate = new Date(lastCandle.timestamp * 1000)
                const today = new Date()

                // Check if the last candle is from Today
                const isSameDay = lastDate.getDate() === today.getDate() &&
                    lastDate.getMonth() === today.getMonth() &&
                    lastDate.getFullYear() === today.getFullYear()

                if (isSameDay) {
                    // We have today's data!
                    // Current = Today's Close (or live price)
                    // PrevClose = Yesterday's Close (2nd to last candle)
                    currentPrice = lastCandle.price
                    if (validCandles.length > 1) {
                        prevClose = validCandles[validCandles.length - 2].price
                    }
                } else {
                    // Last candle is NOT today (e.g. it's Friday, and today is Monday)
                    // If market is OPEN (e.g. weekday > 10:00), we expect a rollover.
                    // But if Yahoo hasn't sent new data yet, we are in "Pre-Market" or "Delayed" state.
                    // User wants: Friday Price -> becomes Prev Close. Current Price -> Friday Price (0% change).

                    // Check if today is a trading day (Mon-Fri) and time is past 10:00
                    const day = today.getDay()
                    const hour = today.getHours()
                    const isTradingTime = day >= 1 && day <= 5 && hour >= 10

                    if (isTradingTime) {
                        // Force Rollover
                        prevClose = lastCandle.price
                        currentPrice = lastCandle.price // Start at 0% change until new data comes
                    } else {
                        // Weekend or Pre-market: Keep as is (Friday Close, Thursday PrevClose)
                        // This shows the "Friday Closing" state.
                        currentPrice = lastCandle.price
                        if (validCandles.length > 1) {
                            prevClose = validCandles[validCandles.length - 2].price
                        }
                    }
                }
            }
        }

        return {
            code: symbol,
            currentPrice: currentPrice,
            prevClose: prevClose,
            success: true
        }
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error)
        return {
            code: symbol,
            success: false,
            error: error.message
        }
    }
}

async function fetchFundPrice(code, originalSymbol) {
    try {
        // Use a CORS proxy to fetch Fintables
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://fintables.com/fonlar/${code}`)}`
        const response = await fetch(proxyUrl)

        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()
        const html = data.contents

        // Extract price using regex (looking for format like 11,252558)
        const priceMatch = html.match(/(\d+[.,]\d{6})/)

        if (!priceMatch) {
            throw new Error('Price not found')
        }

        // Parse price (convert comma to dot)
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

    // Separate funds and stocks for fetching
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

    // Fetch Stocks (Batch)
    if (stockSymbols.length > 0) {
        try {
            const yahooSymbols = stockSymbols.map(s =>
                options.isForeign ? s : (s.endsWith('.IS') ? s : `${s}.IS`)
            )

            const symbolsParam = yahooSymbols.join(',')
            const url = `/api/yahoo/v7/finance/quote?symbols=${symbolsParam}`

            const response = await fetch(url)

            if (response.ok) {
                const data = await response.json()
                const quotes = data.quoteResponse?.result || []


                const stockResults = stockSymbols.map(originalSymbol => {
                    const yahooSymbol = options.isForeign ? originalSymbol : (originalSymbol.endsWith('.IS') ? originalSymbol : `${originalSymbol}.IS`)
                    const quote = quotes.find(q => q.symbol === yahooSymbol)

                    if (quote) {
                        const result = {
                            code: originalSymbol,
                            currentPrice: quote.regularMarketPrice,
                            prevClose: quote.regularMarketPreviousClose,
                            success: true
                        }
                        setCachedPrice(originalSymbol, result)
                        return result
                    } else {
                        // Try to find stale cache if not found in live data
                        const stale = getStalePrice(originalSymbol)
                        if (stale) return stale

                        return {
                            code: originalSymbol,
                            success: false,
                            error: 'Not found in batch response'
                        }
                    }
                })
                results = [...results, ...stockResults]
            } else {
                console.warn('Batch fetch failed:', response.statusText)
                // Return stale cache if available
                const fallbackResults = stockSymbols.map(s => {
                    const stale = getStalePrice(s)
                    if (stale) return stale
                    return { code: s, success: false, error: `Batch fetch failed: ${response.status}` }
                })
                results = [...results, ...fallbackResults]
            }
        } catch (error) {
            console.error('Batch fetch error:', error)
            // Return stale cache if available
            const fallbackResults = stockSymbols.map(s => {
                const stale = getStalePrice(s)
                if (stale) return stale
                return { code: s, success: false, error: error.message }
            })
            results = [...results, ...fallbackResults]
        }
    }

    const fundResults = await Promise.all(fundPromises)
    results = [...results, ...fundResults]

    // Combine cached and fetched
    return [...cachedResults, ...results].filter(r => r.success)
}

export async function fetchIntradayHistory(symbol, options = {}) {
    // Check if it's a fund (ONLY if not explicitly marked as foreign)
    if (!options.isForeign && isFund(symbol)) {
        try {
            const fundCode = getFundCode(symbol)
            const priceData = await fetchFundPrice(fundCode, symbol)
            if (!priceData.success) return { symbol, data: [] }

            // Create a synthetic intraday history (flat line)
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

    try {
        const yahooSymbol = options.isForeign ? symbol : (symbol.endsWith('.IS') ? symbol : `${symbol}.IS`)
        const range = options.isForeign ? '5d' : '1d'
        const url = `/api/yahoo/v8/finance/chart/${yahooSymbol}?interval=5m&range=${range}`

        const response = await fetch(url)
        if (!response.ok) throw new Error(`API error: ${response.status}`)

        const data = await response.json()
        const result = data.chart.result[0]

        if (!result) {
            return { symbol, data: [] }
        }

        const timestamps = result.timestamp
        const closes = result.indicators.quote[0].close

        const history = timestamps.map((t, i) => ({
            timestamp: t * 1000,
            price: closes[i]
        })).filter(item => item.price != null)

        return {
            symbol,
            prevClose: result.meta.chartPreviousClose,
            data: history
        }
    } catch (error) {
        console.error(`Error fetching history for ${symbol}:`, error)
        return { symbol, data: [] }
    }
}

export async function fetchUSDTRYRate() {
    try {
        // Fetch 5d history for USDTRY=X to find the 15:30 TSI price
        // 15:30 TSI = 12:30 UTC
        const url = `/api/yahoo/v8/finance/chart/USDTRY=X?interval=30m&range=5d`

        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const data = await response.json()
        const result = data.chart.result[0]

        if (!result.timestamp || !result.indicators.quote[0].close) {
            throw new Error("No data found for USDTRY=X")
        }

        const timestamps = result.timestamp
        const closes = result.indicators.quote[0].close

        // Group by day
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

        // Get last available day (Current)
        const sortedDays = Object.keys(candlesByDay).sort()
        const lastDayKey = sortedDays[sortedDays.length - 1]
        const currentDayCandles = candlesByDay[lastDayKey]

        // Get previous available day (Previous)
        const prevDayKey = sortedDays.length > 1 ? sortedDays[sortedDays.length - 2] : null
        const prevDayCandles = prevDayKey ? candlesByDay[prevDayKey] : null

        // Find 12:30 UTC candle (15:30 TSI) for Current Day
        const currentTarget = currentDayCandles.find(c => c.time.hours === 12 && c.time.minutes === 30)
        const currentRate = currentTarget ? currentTarget.price : currentDayCandles[currentDayCandles.length - 1].price

        // Find 12:30 UTC candle (15:30 TSI) for Previous Day
        let prevRate = currentRate // Default to current if prev not found (no change)
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
