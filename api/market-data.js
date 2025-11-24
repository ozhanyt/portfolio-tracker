// Vercel Serverless Function: Market Data Fetcher using RapidAPI Yahoo Finance
// Endpoint: /api/market-data

const RAPIDAPI_KEY = '0ed88c247cmshb4b5e9496b12b97p1d471bjsnfc89f4b69f23';
const RAPIDAPI_HOST = 'yahoo-finance15.p.rapidapi.com';

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

        console.log('Market data cache MISS, fetching from RapidAPI');

        const symbols = [
            'XU100.IS',     // BIST100
            'USDTRY=X',     // USD/TRY
            'BTC-USD',      // Bitcoin
            'GC=F',         // Gold Futures
            'SI=F'          // Silver Futures
        ];

        const symbolsParam = symbols.join(',');
        const url = `https://${RAPIDAPI_HOST}/api/yahoo/qu/quote/v7/get?symbols=${symbolsParam}`;

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
        const quotes = data.quoteResponse?.result || [];

        const getQuote = (symbol) => quotes.find(q => q.symbol === symbol);

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
