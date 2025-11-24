// Vercel Serverless Function: Market Data Fetcher using yahoo-finance2
// Endpoint: /api/market-data

import yahooFinance from 'yahoo-finance2';

const cache = { data: null, timestamp: 0 };
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

    try {
        // Check cache
        if (cache.data && (Date.now() - cache.timestamp < CACHE_DURATION)) {
            console.log('Market data cache HIT');
            return res.status(200).json(cache.data);
        }

        console.log('Market data cache MISS, fetching from Yahoo');

        const symbols = [
            'XU100.IS',     // BIST100
            'USDTRY=X',     // USD/TRY
            'BTC-USD',      // Bitcoin
            'GC=F',         // Gold Futures
            'SI=F'          // Silver Futures
        ];

        const quotes = await yahooFinance.quote(symbols);
        const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

        const getQuote = (symbol) => quotesArray.find(q => q.symbol === symbol);

        const results = [];

        // Helper to format result
        const formatResult = (key, quote) => {
            if (!quote) return null;
            return {
                symbol: key,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent,
                success: true
            };
        };

        // BIST100
        const bist = getQuote('XU100.IS');
        if (bist) results.push(formatResult('BIST100', bist));

        // USDTRY
        const usd = getQuote('USDTRY=X');
        if (usd) results.push(formatResult('USDTRY', usd));

        // BTCUSD
        const btc = getQuote('BTC-USD');
        if (btc) results.push(formatResult('BTCUSD', btc));

        // Precious Metals Calculation
        if (usd) {
            const usdPrice = usd.regularMarketPrice;
            const usdPrev = usd.regularMarketPreviousClose;

            // Gold (XAUTRYG)
            const gold = getQuote('GC=F');
            if (gold) {
                const goldPerGram = gold.regularMarketPrice / 31.1;
                const goldTRY = goldPerGram * usdPrice;

                const prevGoldPerGram = gold.regularMarketPreviousClose / 31.1;
                const prevGoldTRY = prevGoldPerGram * usdPrev;

                results.push({
                    symbol: 'XAUTRYG',
                    price: goldTRY,
                    change: goldTRY - prevGoldTRY,
                    changePercent: ((goldTRY - prevGoldTRY) / prevGoldTRY) * 100,
                    success: true
                });
            }

            // Silver (XAGTRYG)
            const silver = getQuote('SI=F');
            if (silver) {
                const silverPerGram = silver.regularMarketPrice / 31.1;
                const silverTRY = silverPerGram * usdPrice;

                const prevSilverPerGram = silver.regularMarketPreviousClose / 31.1;
                const prevSilverTRY = prevSilverPerGram * usdPrev;

                results.push({
                    symbol: 'XAGTRYG',
                    price: silverTRY,
                    change: silverTRY - prevSilverTRY,
                    changePercent: ((silverTRY - prevSilverTRY) / prevSilverTRY) * 100,
                    success: true
                });
            }
        }

        // Update cache
        cache.data = results;
        cache.timestamp = Date.now();

        return res.status(200).json(results);

    } catch (error) {
        console.error('Error fetching market data:', error);

        // Return stale cache if available
        if (cache.data) {
            console.log('Returning stale cache due to error');
            return res.status(200).json(cache.data);
        }

        return res.status(500).json({
            error: 'Failed to fetch market data',
            message: error.message
        });
    }
}
