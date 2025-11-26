/**
 * Market data service for fetching market indicators via Google Apps Script proxy
 * BIST100, USDTRY, XAUTRYG (Gold), BTCUSD
 */

// Persistent cache for market data
const CACHE_KEY = 'market_data_cache'
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes to reduce quota usage

export async function fetchMarketData() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
    }

    try {
        const SHEET_API_URL = import.meta.env.VITE_SHEET_API_URL;
        // Cache busting için timestamp ekle
        const response = await fetch(`${SHEET_API_URL}?market=true&t=${Date.now()}`);

        if (!response.ok) throw new Error('Market data fetch failed');

        const data = await response.json();

        // Veriyi formatla (Sheet'ten gelen format: { symbol, price, changePercent })
        // UI'ın beklediği format: { symbol, price, changePercent } (Aynı)

        // Cache'le
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data
        }));

        return data;
    } catch (error) {
        console.error('Market data error:', error);
        return [];
    }
}
