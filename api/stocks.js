// Vercel Serverless Function: Stock Price Fetcher using Twelve Data
// Endpoint: /api/stocks?symbols=THYAO.IS,GARAN.IS&foreign=false

const TWELVE_DATA_API_KEY = 'ea33416ef7404879958f1fc4e3d3a389';

// In-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
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
        const cacheKey = `${symbols}-${isForeign}`;
        const cached = cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log('Cache HIT:', cacheKey);
            return res.status(200).json(cached.data);
        }

        console.log('Cache MISS, fetching from Twelve Data:', cacheKey);

        // Fetch each symbol (Twelve Data supports batch but with different format)
        const results = await Promise.all(
            symbolList.map(async (originalSymbol) => {
                try {
                    // For Turkish stocks, keep .IS suffix
                    const symbol = isForeign ? originalSymbol : (originalSymbol.endsWith('.IS') ? originalSymbol : `${originalSymbol}.IS`);

                    const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;
                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error(`Twelve Data error: ${response.status}`);
                    }

                    const data = await response.json();

                    // Twelve Data returns: { close, previous_close, ... }
                    if (data.close && data.previous_close) {
                        return {
                            code: originalSymbol,
                            currentPrice: parseFloat(data.close),
                            prevClose: parseFloat(data.previous_close),
                            success: true
                        };
                    } else if (data.status === 'error') {
                        throw new Error(data.message || 'API error');
                    } else {
                        throw new Error('No data from Twelve Data');
                    }
                } catch (error) {
                    console.error(`Error fetching ${originalSymbol}:`, error.message);
                    return {
                        code: originalSymbol,
                        success: false,
                        error: error.message
                    };
                }
            })
        );

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
