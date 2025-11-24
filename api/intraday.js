// Vercel Serverless Function: Intraday Chart Data Fetcher using Twelve Data
// Endpoint: /api/intraday?symbol=THYAO.IS&foreign=false

const TWELVE_DATA_API_KEY = 'ea33416ef7404879958f1fc4e3d3a389';

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
        const cacheKey = `${symbol}-${isForeign}`;
        const cached = cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log('Intraday cache HIT:', cacheKey);
            return res.status(200).json(cached.data);
        }

        console.log('Intraday cache MISS, fetching from Twelve Data:', cacheKey);

        const twelveSymbol = isForeign ? symbol : (symbol.endsWith('.IS') ? symbol : `${symbol}.IS`);

        // Twelve Data: 5min interval, outputsize for intraday data
        const url = `https://api.twelvedata.com/time_series?symbol=${twelveSymbol}&interval=5min&outputsize=78&apikey=${TWELVE_DATA_API_KEY}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Twelve Data error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'error') {
            throw new Error(data.message || 'API error');
        }

        if (!data.values || data.values.length === 0) {
            return res.status(200).json({
                symbol,
                prevClose: null,
                data: []
            });
        }

        // Map to our format (Twelve Data returns newest first, reverse it)
        const history = data.values
            .reverse()
            .map(item => ({
                timestamp: new Date(item.datetime).getTime(),
                price: parseFloat(item.close)
            }))
            .filter(item => item.price && !isNaN(item.price));

        // Get previous close from meta or first data point
        const prevClose = data.meta?.previous_close
            ? parseFloat(data.meta.previous_close)
            : (history.length > 0 ? history[0].price : null);

        const responseData = {
            symbol,
            prevClose,
            data: history
        };

        cache.set(cacheKey, {
            timestamp: Date.now(),
            data: responseData
        });

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Error fetching intraday data:', error);

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
