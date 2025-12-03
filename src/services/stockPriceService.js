import { fetchMarketData } from './marketDataService';

/**
 * New Stock Price Service using Google Sheets API
 * Bu servis artık Sheet'teki güncellenmiş veriyi kullanır (Yahoo quota sorunu çözülür)
 */

const SHEET_API_URL = import.meta.env.VITE_SHEET_API_URL;

// Cache ayarları (1 dakika - Test için düşürüldü)
const CACHE_DURATION = 1 * 60 * 1000;
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
    const cached = getCachedPrice(symbol);
    if (cached) return cached;

    try {
        // Cache busting için timestamp ekle
        const url = `${SHEET_API_URL}?symbol=${encodeURIComponent(symbol)}&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            setCachedPrice(symbol, data);
            return data;
        } else {
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
        // Cache busting için timestamp ekle
        const url = `${SHEET_API_URL}?symbols=${encodeURIComponent(symbolsParam)}&t=${Date.now()}`;

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

        const fallbackResults = symbolsToFetch.map(s => {
            const stale = getStalePrice(s);
            if (stale) return stale;
            return { code: s, success: false, error: error.message };
        });

        return [...cachedResults, ...fallbackResults].filter(r => r.success);
    }
}

/**
 * Intraday grafikler KAPALI
 */
export async function fetchIntradayHistory(symbol, options = {}) {
    console.log('Intraday charts disabled');
    return {
        symbol,
        data: [],
        prevClose: null
    };
}

/**
 * USD/TRY kuru
 */


/**
 * USD/TRY kuru
 */
export async function fetchUSDTRYRate() {
    try {
        const marketData = await fetchMarketData();
        const usdData = marketData.find(item => item.symbol === 'USDTRY');

        if (usdData && usdData.price) {
            // Calculate previous rate from change percent
            // change = ((current - prev) / prev) * 100
            // prev = current / (1 + change/100)
            let prevRate = usdData.price;
            if (usdData.changePercent !== undefined && usdData.changePercent !== null) {
                prevRate = usdData.price / (1 + (usdData.changePercent / 100));
            }

            return {
                currentRate: usdData.price,
                prevRate: prevRate
            };
        }

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
/**
 * Fetch all holdings for a specific fund from Google Sheet
 */
export async function fetchFundHoldings(fundCode) {
    try {
        // Cache busting with timestamp
        const url = `${SHEET_API_URL}?fund=${encodeURIComponent(fundCode)}&t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Ensure data is an array
        if (Array.isArray(data)) {
            return data.map(item => {
                // Map fields from Sheet API (handles both 'code' and 'symbol', 'currentPrice' and 'price')
                const code = item.code || item.symbol;
                const currentPrice = item.currentPrice !== undefined ? Number(item.currentPrice) : Number(item.price || 0);
                const prevClose = item.prevClose !== undefined ? Number(item.prevClose) : currentPrice;
                const quantity = item.quantity !== undefined ? Number(item.quantity) : 0;

                // Calculate changePercent if missing
                let changePercent = item.changePercent !== undefined ? Number(item.changePercent) : 0;
                if (item.changePercent === undefined && currentPrice > 0 && prevClose > 0) {
                    changePercent = ((currentPrice - prevClose) / prevClose) * 100;
                }

                return {
                    code: code || 'UNKNOWN',
                    quantity: quantity,
                    cost: prevClose || currentPrice, // Use prevClose as initial cost estimate
                    currentPrice: currentPrice,
                    prevClose: prevClose,
                    changePercent: changePercent,
                    isForeign: false,
                    isManual: false
                };
            });
        }

        return [];
    } catch (error) {
        console.error(`Error fetching holdings for ${fundCode}:`, error);
        return [];
    }
}
