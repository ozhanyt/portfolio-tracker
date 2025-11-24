// Vercel Serverless Function: Stock Price Fetcher using Finnhub
// Endpoint: /api/stocks?symbols=THYAO.IS,GARAN.IS&foreign=false

const FINNHUB_API_KEY = 'd4i6egpr01qkv40h4e4gd4i6egpr01qkv40h4e50';

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

        console.log('Cache MISS, fetching from Finnhub:', cacheKey);

        // Fetch each symbol individually (Finnhub doesn't support batch)
        const results = await Promise.all(
            symbolList.map(async (originalSymbol) => {
                try {
                    // For Turkish stocks, use .IS suffix; for foreign, use as-is
                    const finnhubSymbol = isForeign
                        ? originalSymbol
                        : (originalSymbol.endsWith('.IS') ? originalSymbol : `${originalSymbol}.IS`);

                    const url = `https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_API_KEY}`;
                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error(`Finnhub error: ${response.status}`);
                    }

                    const data = await response.json();

                    // Finnhub returns: { c: current, pc: previous close, ... }
                    if (data.c && data.pc) {
                        return {
                            code: originalSymbol,
                            currentPrice: data.c,
                            prevClose: data.pc,
                            success: true
                        };
                    } else {
                        return {
                            code: originalSymbol,
                            success: false,
                            error: 'No data from Finnhub'
                        };
                    }
                } catch (error) {
                    return {
                        code: originalSymbol,
                        success: false,
                        error: error.message
                    };
                }
            })
        );

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
