/**
 * Market data service for fetching market indicators via Google Apps Script proxy
 * BIST100, USDTRY, XAUTRYG (Gold), BTCUSD
 */

// Persistent cache for market data
// Cache key includes version to invalidate old unnormalized data
const CACHE_KEY = 'market_data_cache_v2'
const OLD_CACHE_KEY = 'market_data_cache'
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes
export const marketDebugData = {
    lastUrl: '',
    lastStatus: 'Init',
    lastError: null,
    itemCount: 0,
    isFromCache: false
}

/**
 * Normalize changePercent values from the API.
 * API returns inconsistent formats:
 *   - Most symbols: raw decimal (e.g., 0.034 meaning 3.4%)
 *   - BIST30: already percentage (e.g., -2.78 meaning -2.78%)
 * Convert all to percentage format (e.g., 3.4, -2.78)
 */
function normalizeMarketData(data) {
    if (!Array.isArray(data)) return data;
    return data.map(item => {
        if (item.changePercent !== undefined && item.changePercent !== null) {
            // If absolute value < 1, it's a raw decimal that needs *100
            if (Math.abs(item.changePercent) < 1) {
                return { ...item, changePercent: item.changePercent * 100 };
            }
        }
        return item;
    });
}

export async function fetchMarketData() {
    // Clean up old cache key
    localStorage.removeItem(OLD_CACHE_KEY);

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

        const rawData = await response.json();
        marketDebugData.lastStatus = 'Success';
        marketDebugData.itemCount = Array.isArray(rawData) ? rawData.length : 0;
        console.log('📡 Market Data Fetched (raw):', rawData);

        // Normalize changePercent values before caching
        const data = normalizeMarketData(rawData);
        console.log('📡 Market Data Normalized:', data);

        // Cache normalized data
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
