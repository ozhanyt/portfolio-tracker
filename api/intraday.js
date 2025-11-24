// Vercel Serverless Function: Intraday Chart Data Fetcher using RapidAPI Yahoo Finance
// Endpoint: /api/intraday?symbol=THYAO.IS&foreign=false

const RAPIDAPI_KEY = '0ed88c247cmshb4b5e9496b12b97p1d471bjsnfc89f4b69f23';
const RAPIDAPI_HOST = 'yahoo-finance15.p.rapidapi.com';

const cache = new Map();
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute (more frequent for charts)

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

        console.log('Intraday cache MISS, fetching from RapidAPI:', cacheKey);

        const yahooSymbol = isForeign ? symbol : (symbol.endsWith('.IS') ? symbol : `${symbol}.IS`);
        const range = isForeign ? '5d' : '1d';
        const url = `https://${RAPIDAPI_HOST}/api/yahoo/ch/chart/${yahooSymbol}?interval=5m&range=${range}`;

        const response = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            throw new Error(`RapidAPI error: ${response.status}`);
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
            return res.status(200).json({
                symbol,
                prevClose: null,
                data: []
            });
        }

        const timestamps = result.timestamp;
        const closes = result.indicators.quote[0].close;

        // Map to clean format, filtering out nulls
        const history = timestamps
            .map((t, i) => ({
                timestamp: t * 1000, // Convert to ms
                price: closes[i]
            }))
            .filter(item => item.price != null);

        const responseData = {
            symbol,
            prevClose: result.meta?.chartPreviousClose,
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
