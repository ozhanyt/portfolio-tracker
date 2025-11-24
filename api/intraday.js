// Vercel Serverless Function: Intraday Chart Data Fetcher using Finnhub
// Endpoint: /api/intraday?symbol=THYAO.IS&foreign=false

const FINNHUB_API_KEY = 'd4i6egpr01qkv40h4e4gd4i6egpr01qkv40h4e50';

const cache = new Map();
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { symbol, foreign } = req.query;

    if (!symbol) {
        return res.status(400).json({ error: 'symbol parameter required' });
    }

    const isForeign = foreign === 'true';

    try {
        // Check cache
        const cacheKey = `${symbol}-${isForeign}`;
        const cached = cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log('Intraday cache HIT:', cacheKey);
            return res.status(200).json(cached.data);
        }

        console.log('Intraday cache MISS, fetching from Finnhub:', cacheKey);

        const finnhubSymbol = isForeign ? symbol : (symbol.endsWith('.IS') ? symbol : `${symbol}.IS`);

        // Calculate timestamps
        const to = Math.floor(Date.now() / 1000);
        const from = to - (isForeign ? 5 * 24 * 60 * 60 : 24 * 60 * 60); // 5 days for foreign, 1 day for local

        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${finnhubSymbol}&resolution=5&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Finnhub error: ${response.status}`);
        }

        const data = await response.json();

        if (data.s !== 'ok' || !data.t || !data.c) {
            return res.status(200).json({
                symbol,
                prevClose: null,
                data: []
            });
        }

        // Map to our format
        const history = data.t.map((timestamp, i) => ({
            timestamp: timestamp * 1000, // Convert to ms
            price: data.c[i]
        })).filter(item => item.price != null);

        // Get previous close from first data point
        const prevClose = history.length > 0 ? history[0].price : null;

        const responseData = {
            symbol,
            prevClose,
            data: history
        };

        // Cache the result
        cache.set(cacheKey, {
            timestamp: Date.now(),
            data: responseData
        });

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Error fetching intraday data:', error);

        // Try to return stale cache
        const cacheKey = `${symbol}-${isForeign}`;
        const stale = cache.get(cacheKey);
        if (stale) {
            console.log('Returning stale cache due to error');
            return res.status(200).json(stale.data);
        }

        return res.status(200).json({
            symbol,
            prevClose: null,
            data: []
        });
    }
}
