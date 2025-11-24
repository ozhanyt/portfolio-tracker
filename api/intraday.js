// Vercel Serverless Function: Intraday Chart Data Fetcher using yahoo-finance2 v2
// Endpoint: /api/intraday?symbol=THYAO.IS&foreign=false

import { YahooFinance } from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

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

        console.log('Intraday cache MISS, fetching from Yahoo:', cacheKey);

        const yahooSymbol = isForeign ? symbol : (symbol.endsWith('.IS') ? symbol : `${symbol}.IS`);

        // Calculate period for yahoo-finance2
        const period1 = new Date();
        if (isForeign) {
            period1.setDate(period1.getDate() - 5); // 5 days for foreign
        } else {
            period1.setHours(0, 0, 0, 0); // Start of today for local
        }

        const result = await yahooFinance.chart(yahooSymbol, {
            period1,
            interval: '5m'
        });

        if (!result?.quotes || result.quotes.length === 0) {
            return res.status(200).json({
                symbol,
                prevClose: null,
                data: []
            });
        }

        // Map to our format
        const history = result.quotes
            .filter(q => q.close != null)
            .map(q => ({
                timestamp: q.date.getTime(),
                price: q.close
            }));

        const responseData = {
            symbol,
            prevClose: result.meta?.previousClose || result.meta?.chartPreviousClose || null,
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
