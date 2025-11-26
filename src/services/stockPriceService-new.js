/**
 * New Stock Price Service using Google Sheets API
 * Bu servis artık Sheet'teki güncellenmiş veriyi kullanır (Yahoo quota sorunu çözülür)
 */

const SHEET_API_URL = import.meta.env.VITE_SHEET_API_URL;

// Cache ayarları (30 dakika)
const CACHE_DURATION = 30 * 60 * 1000;
const CACHE_PREFIX = 'portfolio_cache_';

function getCachedPrice(symbol) {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + symbol);
        if (!item) return null;
        const cached = JSON.parse(item);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
        return null;
    } catch (e) {
        return null;
    }
}

function setCachedPrice(symbol, data) {
    try {
        const cacheItem = {
            timestamp: Date.now(),
            data
        };
        localStorage.setItem(CACHE_PREFIX + symbol, JSON.stringify(cacheItem));
    } catch (e) {
        // Ignore
    }
}

function getStalePrice(symbol) {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + symbol);
        if (!item) return null;
        return JSON.parse(item).data;
    } catch (e) {
        return null;
    }
}

/**
 * Tek bir hisse için fiyat getir
 */
export async function fetchStockPrice(symbol, options = {}) {
    // Önce cache'e bak
    const cached = getCachedPrice(symbol);
    if (cached) return cached;

    try {
        const url = `${SHEET_API_URL}?symbol=${encodeURIComponent(symbol)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            setCachedPrice(symbol, data);
            return data;
        } else {
            // Stale cache kullan
            const stale = getStalePrice(symbol);
            if (stale) return stale;

            return {
                code: symbol,
                success: false,
                error: data.error || 'Unknown error'
            };
        }
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);

        // Stale cache kullan
        const stale = getStalePrice(symbol);
        if (stale) return stale;

        return {
            code: symbol,
            success: false,
            error: error.message
        };
    }
}

/**
 * Birden fazla hisse için fiyat getir
 */
export async function fetchStockPrices(symbols, options = {}) {
    if (symbols.length === 0) return [];

    // Önce cache'e bak
    const cachedResults = [];
    const symbolsToFetch = [];

    symbols.forEach(symbol => {
        const cached = getCachedPrice(symbol);
        if (cached) {
            cachedResults.push(cached);
        } else {
            symbolsToFetch.push(symbol);
        }
    });

    if (symbolsToFetch.length === 0) {
        return cachedResults;
    }

    try {
        const symbolsParam = symbolsToFetch.join(',');
        const url = `${SHEET_API_URL}?symbols=${encodeURIComponent(symbolsParam)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const results = await response.json();

        // Cache'le
        results.forEach(result => {
            if (result.success) {
                setCachedPrice(result.code, result);
            }
        });

        return [...cachedResults, ...results].filter(r => r.success);

    } catch (error) {
        console.error('Batch fetch error:', error);

        // Stale cache kullan
        const fallbackResults = symbolsToFetch.map(s => {
            const stale = getStalePrice(s);
            if (stale) return stale;
            return { code: s, success: false, error: error.message };
        });

        return [...cachedResults, ...fallbackResults].filter(r => r.success);
    }
}

/**
 * Intraday geçmişi getir (Şimdilik desteklenmiyor, gelecekte Sheet'e eklenebilir)
 */
export async function fetchIntradayHistory(symbol, options = {}) {
    console.warn('Intraday history is not available via Sheet API yet');
    return {
        symbol,
        data: [],
        prevClose: null
    };
}

/**
 * USD/TRY kuru getir (TCMB verisi Sheet'te varsa oradan alınabilir)
 */
export async function fetchUSDTRYRate() {
    // Bu fonksiyon TCMB'den çekiyor, olduğu gibi bırakabiliriz
    // Veya Sheet'te Q2 hücresinde varsa oradan okuyabiliriz
    try {
        // Şimdilik varsayılan değer dönelim, gerekirse Sheet'ten okutabiliriz
        return {
            currentRate: 34.50,
            prevRate: 34.50
        };
    } catch (error) {
        console.error("Error fetching USDTRY rate:", error);
        return {
            currentRate: 34.50,
            prevRate: 34.50
        };
    }
}
