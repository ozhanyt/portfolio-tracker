import { db } from '@/firebase'
import { doc, setDoc, getDoc, arrayUnion, Timestamp } from 'firebase/firestore'
import { fetchFundHoldings } from './stockPriceService'

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    const now = new Date()
    return now.toISOString().split('T')[0]
}

/**
 * Get current time in HH:MM format
 */
function getCurrentTime() {
    const now = new Date()
    return now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

// Helper to parse Turkish float
const parseTurkishFloat = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        return parseFloat(val.replace(',', '.'));
    }
    return 0;
};

/**
 * Save intraday snapshot to Firestore
 * @param {string} fundCode - Fund code (e.g., "TLY")
 * @param {Object} priceData - Price data from API
 */
export async function saveIntradaySnapshot(fundCode, priceData) {
    try {
        const date = getTodayDate()
        const time = getCurrentTime()

        // 1. Fetch Fund Settings (Multiplier & PPF)
        const fundDocRef = doc(db, 'funds', fundCode)
        const fundDoc = await getDoc(fundDocRef)
        const fundData = fundDoc.exists() ? fundDoc.data() : {}

        const multiplier = parseTurkishFloat(fundData.multiplier) || 1
        const ppfRate = parseTurkishFloat(fundData.ppfRate) || 0

        // 2. Calculate fund totals
        let totalValue = 0
        let totalCost = 0

        priceData.forEach(item => {
            const currentValue = item.quantity * item.currentPrice
            const cost = item.quantity * item.prevClose
            totalValue += currentValue
            totalCost += cost
        })

        // 3. Calculate Adjusted Return
        // Raw Stock Profit
        let totalProfit = totalValue - totalCost

        // Apply Multiplier & PPF Logic
        if (multiplier) {
            const stockWeight = multiplier
            const ppfWeight = 1 - stockWeight
            const ppfProfit = totalCost * ppfRate * ppfWeight

            // Adjusted Profit = (Raw Stock Profit * Stock Weight) + PPF Profit
            totalProfit = (totalProfit * stockWeight) + ppfProfit
        }

        // Adjusted Return %
        const adjustedReturnPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

        const snapshot = {
            time,
            totalValue: totalCost + totalProfit, // Adjusted Total Value
            totalCost,
            return: adjustedReturnPercent,
            timestamp: Timestamp.now(),
            priceCount: priceData.length
        }

        const docRef = doc(db, 'funds', fundCode, 'intraday', date)

        await setDoc(docRef, {
            snapshots: arrayUnion(snapshot),
            lastUpdate: Timestamp.now()
        }, { merge: true })

        console.log(`✅ Snapshot saved for ${fundCode} at ${time}: ${adjustedReturnPercent.toFixed(2)}% (Mult: ${multiplier}, PPF: ${ppfRate})`)

        return { success: true, snapshot }
    } catch (error) {
        console.error('Error saving snapshot:', error)
        throw error
    }
}

/**
 * Get intraday snapshots for a specific fund and date
 * @param {string} fundCode - Fund code
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 */
export async function getIntradayData(fundCode, date = null) {
    try {
        const targetDate = date || getTodayDate()
        const docRef = doc(db, 'funds', fundCode, 'intraday', targetDate)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const data = docSnap.data()
            return {
                snapshots: data.snapshots || [],
                lastUpdate: data.lastUpdate?.toDate()
            }
        }

        return { snapshots: [], lastUpdate: null }
    } catch (error) {
        console.error('Error fetching intraday data:', error)
        throw error
    }
}

/**
 * Manual snapshot trigger (for localhost testing)
 * Fetches current data from Google Sheets and saves snapshot
 */
export async function manualSnapshot(fundCode) {
    try {
        console.log(`📸 Taking snapshot for ${fundCode}...`)

        // Fetch current prices from Google Sheets API
        const holdings = await fetchFundHoldings(fundCode)

        if (!holdings || holdings.length === 0) {
            throw new Error('No holdings data received')
        }

        // Save snapshot
        const result = await saveIntradaySnapshot(fundCode, holdings)

        return result
    } catch (error) {
        console.error('Manual snapshot error:', error)
        throw error
    }
}
