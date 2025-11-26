import { useState, useEffect } from 'react'
import { fetchIntradayHistory } from '@/services/stockPriceService'

export function useIntradayData(portfolio, multiplier = 1, fundName = '') {
    const [chartData, setChartData] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const loadData = async () => {
            if (!portfolio || portfolio.length === 0) {
                setChartData([])
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            try {
                // Check if it is a foreign fund OR if the portfolio contains foreign stocks
                const isForeignFund = (fundName && fundName.toLowerCase().includes('yabancı')) || portfolio.some(item => item.isForeign)

                // Fetch history for all stocks
                const promises = portfolio.map(item => {
                    if (item.isManual) {
                        // For manual items, generate a flat line history locally without fetching
                        const now = new Date()
                        const start = new Date(now).setHours(10, 0, 0, 0)
                        const end = new Date(now).setHours(18, 0, 0, 0)
                        const data = []

                        // Generate points every 5 mins
                        for (let t = start; t <= end; t += 5 * 60 * 1000) {
                            if (t > now.getTime()) break
                            data.push({
                                timestamp: t,
                                price: item.currentPrice
                            })
                        }

                        return Promise.resolve({
                            symbol: item.code,
                            prevClose: item.prevClose || item.cost,
                            data
                        })
                    }
                    return fetchIntradayHistory(item.code, { isForeign: item.isForeign })
                })
                const results = await Promise.all(promises)

                if (!isMounted) return

                // Normalize dates
                const today = new Date()
                const todayYear = today.getFullYear()
                const todayMonth = today.getMonth()
                const todayDay = today.getDate()

                // Calculate Foreign Fund Time Range based on User Request
                // TSI is UTC+3. 17:30 TSI = 14:30 UTC.
                let rangeStart, rangeEnd

                if (isForeignFund) {
                    const now = new Date()
                    const day = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

                    const setTime1730 = (d) => {
                        const newDate = new Date(d)
                        newDate.setUTCHours(14, 30, 0, 0)
                        return newDate
                    }

                    if (day === 0 || day === 6) {
                        // Weekend (Sat/Sun) -> Show Friday Session
                        // Request said Thu-Fri, but that shows Thursday. Assuming user wants Friday (Last session).
                        // So we use Fri 17:30 - Sat 17:30 (which covers Fri Close)
                        const friday = new Date(now)
                        friday.setDate(now.getDate() - (day === 0 ? 2 : 1))
                        const saturday = new Date(friday)
                        saturday.setDate(friday.getDate() + 1)

                        rangeStart = setTime1730(friday).getTime()
                        rangeEnd = setTime1730(saturday).getTime()
                    }
                    else if (day === 1) {
                        // Monday -> Request: Fri 17:30 - Mon 17:30
                        const friday = new Date(now)
                        friday.setDate(now.getDate() - 3)

                        rangeStart = setTime1730(friday).getTime()
                        rangeEnd = setTime1730(now).getTime()
                    }
                    else {
                        // Tue, Wed, Thu, Fri -> Request: Yesterday 17:30 - Today 17:30
                        const yesterday = new Date(now)
                        yesterday.setDate(now.getDate() - 1)

                        rangeStart = setTime1730(yesterday).getTime()
                        rangeEnd = setTime1730(now).getTime()
                    }
                }

                results.forEach(res => {
                    if (isForeignFund) {
                        // Filter data to keep only points within rangeStart and rangeEnd
                        // Do NOT normalize dates
                        if (res && res.data) {
                            res.data = res.data.filter(point => point.timestamp >= rangeStart && point.timestamp <= rangeEnd)
                        }
                    }
                    // For Local Funds, we keep the original timestamps (e.g. Friday).
                    // Normalizing to "Today" causes issues on Monday mornings (data moves to future).
                    // Keeping original dates ensures correct "Close Time" calculation.
                })

                // Create a map of symbol -> { data, prevClose }
                const stockMap = {}
                let totalPrevClose = 0

                results.forEach((res, index) => {
                    const item = portfolio[index]
                    stockMap[item.code] = {
                        data: res.data,
                        // Use fetched prevClose if available, otherwise fallback to item.cost (not ideal but safe)
                        prevClose: res.prevClose || item.cost
                    }
                    totalPrevClose += (res.prevClose || item.cost) * item.quantity
                })

                // Collect all unique timestamps
                const allTimestamps = new Set()
                results.forEach(res => {
                    res.data.forEach(point => allTimestamps.add(point.timestamp))
                })

                // Sort timestamps
                const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

                // Aggregate portfolio value at each timestamp
                const aggregated = sortedTimestamps.map(timestamp => {
                    let currentTotalValue = 0

                    portfolio.forEach(item => {
                        const stockInfo = stockMap[item.code]
                        if (!stockInfo) return

                        // Find price at this timestamp
                        // If exact match not found, find the closest previous price (fill forward)
                        let price = null
                        const exactMatch = stockInfo.data.find(d => d.timestamp === timestamp)

                        if (exactMatch) {
                            price = exactMatch.price
                        } else {
                            // Find last known price before this timestamp
                            const prevPoints = stockInfo.data.filter(d => d.timestamp < timestamp)
                            if (prevPoints.length > 0) {
                                price = prevPoints[prevPoints.length - 1].price
                            } else {
                                // If no data before this time (e.g. stock started trading later), use prevClose
                                price = stockInfo.prevClose
                            }
                        }

                        currentTotalValue += price * item.quantity
                    })

                    // Calculate percentage return relative to totalPrevClose
                    // (Current - Prev) / Prev
                    let totalProfit = currentTotalValue - totalPrevClose

                    // Apply Multiplier
                    if (multiplier && multiplier !== 1) {
                        totalProfit = totalProfit * multiplier
                    }

                    const returnPercent = totalPrevClose > 0
                        ? (totalProfit / totalPrevClose) * 100
                        : 0

                    const date = new Date(timestamp)
                    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`

                    return {
                        time: timeStr,
                        value: returnPercent,
                        timestamp // Keep for debugging or advanced usage
                    }
                })

                // Append the "Current" or "Closing" point derived from the latest portfolio data
                // This ensures the chart ends exactly at the "Daily Return" value shown in the card
                if (portfolio.length > 0 && totalPrevClose > 0) {
                    const currentTotalValue = portfolio.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0)
                    let currentTotalProfit = currentTotalValue - totalPrevClose

                    // Apply Multiplier
                    if (multiplier && multiplier !== 1) {
                        currentTotalProfit = currentTotalProfit * multiplier
                    }

                    const currentReturnPercent = (currentTotalProfit / totalPrevClose) * 100

                    // Determine time label
                    let finalTimeStr = ""
                    let finalTimestamp = 0

                    const lastPoint = aggregated[aggregated.length - 1]
                    const now = new Date()

                    if (lastPoint) {
                        // Use the date of the last data point to determine the close time (18:10)
                        // This handles weekends correctly (e.g. if last point is Friday, close is Friday 18:10)
                        const lastPointDate = new Date(lastPoint.timestamp)
                        const closeTime = new Date(lastPointDate)
                        closeTime.setHours(18, 10, 0, 0)

                        if (now > closeTime) {
                            // Market closed (or it's a later date), use 18:10 of that day
                            finalTimeStr = "18:10"
                            finalTimestamp = closeTime.getTime()
                        } else {
                            // Market open, use current time
                            finalTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
                            finalTimestamp = now.getTime()
                        }

                        // Only append if it's later than the last chart point AND within a reasonable timeframe
                        const timeDiff = finalTimestamp - lastPoint.timestamp
                        const MAX_GAP = 12 * 60 * 60 * 1000

                        if (finalTimestamp > lastPoint.timestamp && timeDiff < MAX_GAP) {
                            aggregated.push({
                                time: finalTimeStr,
                                value: currentReturnPercent,
                                timestamp: finalTimestamp
                            })
                        }
                    } else {
                        // No data points yet, but we have a current value. 
                        // Just show current time.
                        finalTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
                        aggregated.push({
                            time: finalTimeStr,
                            value: currentReturnPercent,
                            timestamp: now.getTime()
                        })
                    }
                }

                setChartData(aggregated)
            } catch (error) {
                console.error("Error aggregating intraday data:", error)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        loadData()

        // Refresh every 3 minutes to reduce quota usage
        const interval = setInterval(loadData, 180000)
        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [portfolio, multiplier])

    return { chartData, isLoading }
}
