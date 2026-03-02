/**
 * Market data service for fetching market indicators via Google Apps Script proxy
 * BIST100, USDTRY, XAUTRYG (Gold), BTCUSD
 */

// Persistent cache for market data
const CACHE_KEY = 'market_data_cache'
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes
export const marketDebugData = {
    lastUrl: '',
    lastStatus: 'Init',
    lastError: null,
    itemCount: 0,
    isFromCache: false
}

export async function fetchMarketData() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
            marketDebugData.lastStatus = 'Success (Cached)';
            marketDebugData.itemCount = Array.isArray(data) ? data.length : 0;
            marketDebugData.isFromCache = true;
            return data;
        }
    }

    marketDebugData.isFromCache = false;

    try {
        const SHEET_API_URL = import.meta.env.VITE_SHEET_API_URL;
        const url = `${SHEET_API_URL}?market=true&t=${Date.now()}`;
        marketDebugData.lastUrl = url;

        // Simple fetch without custom headers to avoid CORS preflight (OPTIONS)
        const response = await fetch(url);

        if (!response.ok) {
            marketDebugData.lastStatus = `Failed: ${response.status}`;
            throw new Error('Market data fetch failed');
        }

        const data = await response.json();
        marketDebugData.lastStatus = 'Success';
        marketDebugData.itemCount = Array.isArray(data) ? data.length : 0;
        console.log('📡 Market Data Fetched:', data);

        // Normalize changePercent: API returns some values as decimals (0.034 = 3.4%)
        // and others (BIST30) already as percentages (-2.78 = -2.78%)
        // Convert all to percentage format for consistent UI display
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.changePercent !== undefined && item.changePercent !== null) {
                    // If absolute value < 1, it's likely a decimal that needs *100
                    if (Math.abs(item.changePercent) < 1) {
                        item.changePercent = item.changePercent * 100;
                    }
                }
            });
        }

        // Cache'le (SADECE veri varsa)
        if (Array.isArray(data) && data.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data
            }));
        } else {
            console.warn('⚠️ Market API returned empty data. Not caching.');
        }

        return data;
    } catch (error) {
        console.error('Market data error:', error);
        marketDebugData.lastStatus = 'Error';
        marketDebugData.lastError = error.message;
        return [];
    }
}
