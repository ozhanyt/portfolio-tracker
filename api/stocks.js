// Vercel Serverless Function: Stock Price Fetcher using yahoo-finance2
// Endpoint: /api/stocks?symbols=THYAO.IS,GARAN.IS&foreign=false

import yahooFinance from 'yahoo-finance2';

// In-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { symbols, foreign } = req.query;

    if (!symbols) {
        return res.status(400).json({ error: 'symbols parameter required' });
    }

    const symbolList = symbols.split(',');
    const isForeign = foreign === 'true';

    try {
        // Check cache
        const cacheKey = `${symbols}-${isForeign}`;
        const cached = cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log('Cache HIT:', cacheKey);
            return res.status(200).json(cached.data);
        }

        console.log('Cache MISS, fetching from Yahoo:', cacheKey);

        // Prepare Yahoo symbols
        const yahooSymbols = symbolList.map(s =>
            isForeign ? s : (s.endsWith('.IS') ? s : `${s}.IS`)
        );

        // Use yahoo-finance2 quote endpoint
        const quotes = await yahooFinance.quote(yahooSymbols);

        // Map to our format
        const results = symbolList.map(originalSymbol => {
            const yahooSymbol = isForeign ? originalSymbol : (originalSymbol.endsWith('.IS') ? originalSymbol : `${originalSymbol}.IS`);
            const quote = Array.isArray(quotes) ? quotes.find(q => q.symbol === yahooSymbol) : (quotes.symbol === yahooSymbol ? quotes : null);

            if (quote && quote.regularMarketPrice) {
                return {
                    code: originalSymbol,
                    currentPrice: quote.regularMarketPrice,
                    prevClose: quote.regularMarketPreviousClose,
                    success: true
                };
            } else {
                return {
                    code: originalSymbol,
                    success: false,
                    error: 'Not found in Yahoo response'
                };
            }
        });

        // Cache the result
        cache.set(cacheKey, {
            timestamp: Date.now(),
            data: results
        });

        return res.status(200).json(results);

    } catch (error) {
        console.error('Error fetching stocks:', error);
        return res.status(500).json({
            error: 'Failed to fetch stock prices',
            message: error.message
        });
    }
}
