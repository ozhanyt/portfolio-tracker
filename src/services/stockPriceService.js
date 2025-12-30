import { fetchMarketData } from './marketDataService';

/**
 * New Stock Price Service using Google Sheets API
 * Bu servis artık Sheet'teki güncellenmiş veriyi kullanır (Yahoo quota sorunu çözülür)
 */

const SHEET_API_URL = import.meta.env.VITE_SHEET_API_URL;

// Cache ayarları (1 dakika - Test için düşürüldü)
const CACHE_DURATION = 1 * 60 * 1000;
const CACHE_PREFIX = 'portfolio_cache_';

function getCacheKey(symbol, fundCode) {
    if (fundCode) {
        return `${CACHE_PREFIX}${symbol}_${fundCode}`;
    }
    return `${CACHE_PREFIX}${symbol}`;
}

function getCachedPrice(symbol, fundCode) {
    try {
        // Try specific fund cache first
        let key = getCacheKey(symbol, fundCode);
        let item = localStorage.getItem(key);

        // If not found and no fundCode specified, try generic cache (legacy)
        if (!item && !fundCode) {
            item = localStorage.getItem(`${CACHE_PREFIX}${symbol}`);
        }

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
        // Use fund-specific key if fund is present in data
        const key = getCacheKey(symbol, data.fund);

        const cacheItem = {
            timestamp: Date.now(),
            data
        };
        localStorage.setItem(key, JSON.stringify(cacheItem));

        // Also save to generic key if it's the first one or for backward compat
        // But be careful not to overwrite if we want to support multi-fund
        // For now, let's just rely on specific keys if 'fund' is present
    } catch (e) {
        // Ignore
    }
}

function getStalePrice(symbol, fundCode) {
    try {
        const key = getCacheKey(symbol, fundCode);
        const item = localStorage.getItem(key);
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
    const cached = getCachedPrice(symbol, options.fundCode);
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
            const stale = getStalePrice(symbol, options.fundCode);
            if (stale) return stale;

            return {
                code: symbol,
                success: false,
                error: data.error || 'Unknown error'
            };
        }
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);

        const stale = getStalePrice(symbol, options.fundCode);
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
        const cached = getCachedPrice(symbol, options.fundCode);
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
        // REVERTED: Do NOT send &fund= parameter as it breaks the API
        const url = `${SHEET_API_URL}?symbols=${encodeURIComponent(symbolsParam)}&t=${Date.now()}`;

        // console.log(`🌐 API Request:`, { symbols: symbolsToFetch, url })

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const results = await response.json();

        // Cache'le
        if (Array.isArray(results)) {
            results.forEach(result => {
                if (result.success) {
                    setCachedPrice(result.code, result);
                }
            });
        } else {
            console.error('API response is not an array:', results);
        }

        const finalResults = [...cachedResults];
        if (Array.isArray(results)) {
            finalResults.push(...results.filter(r => r.success));
        }

        return finalResults;

    } catch (error) {
        console.error('Batch fetch error:', error);

        const fallbackResults = symbolsToFetch.map(s => {
            const stale = getStalePrice(s, options.fundCode);
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
 * Doviz kurlarını (USD, EUR, CHF, CAD, DKK, NOK, GBP) getir
 */
export async function fetchExchangeRates() {
    try {
        const marketData = await fetchMarketData();
        const rates = {
            USD: { current: 38.00, prev: 38.00 },
            EUR: { current: 40.00, prev: 40.00 },
            CHF: { current: 42.00, prev: 42.00 },
            CAD: { current: 27.00, prev: 27.00 },
            DKK: { current: 5.50, prev: 5.50 },
            NOK: { current: 3.50, prev: 3.50 },
            GBP: { current: 48.00, prev: 48.00 },
            TRY: { current: 1, prev: 1 }
        };

        const symbols = {
            USD: 'USDTRY',
            EUR: 'EURTRY',
            CHF: 'CHFTRY',
            CAD: 'CADTRY',
            DKK: 'DKKTRY',
            NOK: 'NOKTRY',
            GBP: 'GBPTRY'
        };

        Object.entries(symbols).forEach(([key, symbol]) => {
            const data = marketData.find(item => item.symbol === symbol);
            if (data && data.price) {
                let prev = data.price;
                if (data.changePercent !== undefined && data.changePercent !== null) {
                    prev = data.price / (1 + (data.changePercent / 100));
                }
                rates[key] = {
                    current: data.price,
                    prev: prev
                };
            } else {
                console.warn(`⚠️ Rate for ${key} (${symbol}) not found in market data. Using fallback.`);
            }
        });

        return rates;
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
        return {
            USD: { current: 38.00, prev: 38.00 },
            EUR: { current: 40.00, prev: 40.00 },
            CHF: { current: 42.00, prev: 42.00 },
            CAD: { current: 27.00, prev: 27.00 },
            DKK: { current: 5.50, prev: 5.50 },
            NOK: { current: 3.50, prev: 3.50 },
            GBP: { current: 48.00, prev: 48.00 },
            TRY: { current: 1, prev: 1 }
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
                    updateTime: item.updateTime,
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
