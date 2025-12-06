import { db } from '../../src/firebase';
import { doc, setDoc, getDoc, arrayUnion, Timestamp } from 'firebase/firestore';

// Standalone fetch function for Cron environment (Node.js)
async function fetchFundHoldings(fundCode) {
    try {
        // Use process.env for Vercel Serverless Function
        const SHEET_API_URL = process.env.VITE_SHEET_API_URL;

        if (!SHEET_API_URL) {
            throw new Error('VITE_SHEET_API_URL environment variable is not set');
        }

        const url = `${SHEET_API_URL}?fund=${encodeURIComponent(fundCode)}&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            return data.map(item => {
                const code = item.code || item.symbol;
                const currentPrice = item.currentPrice !== undefined ? Number(item.currentPrice) : Number(item.price || 0);
                const prevClose = item.prevClose !== undefined ? Number(item.prevClose) : currentPrice;
                const quantity = item.quantity !== undefined ? Number(item.quantity) : 0;

                return {
                    code: code || 'UNKNOWN',
                    quantity: quantity,
                    currentPrice: currentPrice,
                    prevClose: prevClose
                };
            });
        }
        return [];
    } catch (error) {
        console.error(`Error fetching holdings for ${fundCode}:`, error);
        return [];
    }
}

// Helper to get today's date YYYY-MM-DD
function getTodayDate() {
    const now = new Date();
    // Adjust for Turkey timezone (UTC+3)
    const trTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    return trTime.toISOString().split('T')[0];
}

// Helper to get current time HH:MM
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
}

// Helper to parse Turkish float
const parseTurkishFloat = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        return parseFloat(val.replace(',', '.'));
    }
    return 0;
};

export default async function handler(request, response) {
    try {
        console.log('⏰ Cron Job Started: Intraday Snapshot');

        const fundsToTrack = ['TLY', 'SSS', 'BOS', 'AFT', 'DFI'];
        const results = [];

        for (const fundCode of fundsToTrack) {
            try {
                // 1. Fetch live data from Google Sheets
                const holdings = await fetchFundHoldings(fundCode);

                if (!holdings || holdings.length === 0) {
                    console.warn(`⚠️ No holdings found for ${fundCode}`);
                    continue;
                }

                // 2. Fetch Fund Settings (Multiplier & PPF) from Firestore
                const fundDocRef = doc(db, 'funds', fundCode);
                const fundDoc = await getDoc(fundDocRef);
                const fundData = fundDoc.exists() ? fundDoc.data() : {};

                const multiplier = parseTurkishFloat(fundData.multiplier) || 1;
                const ppfRate = parseTurkishFloat(fundData.ppfRate) || 0;

                // 3. Calculate fund totals
                let totalValue = 0;
                let totalCost = 0;

                holdings.forEach(item => {
                    totalValue += item.quantity * item.currentPrice;
                    totalCost += item.quantity * item.prevClose;
                });

                // 4. Calculate Adjusted Return
                // Raw Stock Profit
                let totalProfit = totalValue - totalCost;

                // Apply Multiplier & PPF Logic
                if (multiplier) {
                    const stockWeight = multiplier;
                    const ppfWeight = 1 - stockWeight;
                    const ppfProfit = totalCost * ppfRate * ppfWeight;

                    // Adjusted Profit = (Raw Stock Profit * Stock Weight) + PPF Profit
                    totalProfit = (totalProfit * stockWeight) + ppfProfit;
                }

                // Recalculate Adjusted Total Value for consistency (Cost + Adjusted Profit)
                // Note: We keep totalCost as is, but return is based on adjusted profit
                const adjustedReturnPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

                const time = getCurrentTime();
                const date = getTodayDate();

                const snapshot = {
                    time,
                    totalValue: totalCost + totalProfit, // Adjusted Total Value
                    totalCost,
                    return: adjustedReturnPercent,
                    timestamp: Timestamp.now(),
                    priceCount: holdings.length,
                    isAuto: true
                };

                const docRef = doc(db, 'funds', fundCode, 'intraday', date);

                await setDoc(docRef, {
                    snapshots: arrayUnion(snapshot),
                    lastUpdate: Timestamp.now()
                }, { merge: true });

                results.push({ fund: fundCode, status: 'success', return: adjustedReturnPercent });
                console.log(`✅ Snapshot saved for ${fundCode}: ${adjustedReturnPercent.toFixed(2)}% (Mult: ${multiplier}, PPF: ${ppfRate})`);

            } catch (fundError) {
                console.error(`❌ Error processing ${fundCode}:`, fundError);
                results.push({ fund: fundCode, status: 'error', error: fundError.message });
            }
        }

        return response.status(200).json({ success: true, results });

    } catch (error) {
        console.error('🔥 Cron Job Fatal Error:', error);
        return response.status(500).json({ success: false, error: error.message });
    }
}
