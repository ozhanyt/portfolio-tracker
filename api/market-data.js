// Vercel Serverless Function: Market Data Fetcher using Finnhub
// Endpoint: /api/market-data

const FINNHUB_API_KEY = 'd4i6egpr01qkv40h4e4gd4i6egpr01qkv40h4e50';

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

        console.log('Market data cache MISS, fetching from Finnhub');

        const symbols = [
            { symbol: 'XU100.IS', key: 'BIST100' },
            { symbol: 'USDTRY=X', key: 'USDTRY' },
            { symbol: 'BTC-USD', key: 'BTCUSD' },
            { symbol: 'GC=F', key: 'GOLD' },
            { symbol: 'SI=F', key: 'SILVER' }
        ];

        const quotes = await Promise.all(
            symbols.map(async ({ symbol, key }) => {
                try {
                    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
                    const response = await fetch(url);

                    if (!response.ok) return null;

                    const data = await response.json();

                    if (data.c && data.pc) {
                        return {
                            key,
                            data,
                            price: data.c,
                            prevClose: data.pc
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error fetching ${symbol}:`, error);
                    return null;
                }
            })
        );

        const results = [];

        // BIST100
        const bist = quotes.find(q => q?.key === 'BIST100');
        if (bist) {
            results.push({
                symbol: 'BIST100',
                price: bist.price,
                change: bist.price - bist.prevClose,
                changePercent: ((bist.price - bist.prevClose) / bist.prevClose) * 100,
                success: true
            });
        }

        // USDTRY
        const usd = quotes.find(q => q?.key === 'USDTRY');
        if (usd) {
            results.push({
                symbol: 'USDTRY',
                price: usd.price,
                change: usd.price - usd.prevClose,
                changePercent: ((usd.price - usd.prevClose) / usd.prevClose) * 100,
                success: true
            });
        }

        // BTCUSD
        const btc = quotes.find(q => q?.key === 'BTCUSD');
        if (btc) {
            results.push({
                symbol: 'BTCUSD',
                price: btc.price,
                change: btc.price - btc.prevClose,
                changePercent: ((btc.price - btc.prevClose) / btc.prevClose) * 100,
                success: true
            });
        }

        // Precious Metals Calculation
        if (usd) {
            const usdPrice = usd.price;
            const usdPrev = usd.prevClose;

            const gold = quotes.find(q => q?.key === 'GOLD');
            if (gold) {
                const goldPerGram = gold.price / 31.1;
                const goldTRY = goldPerGram * usdPrice;

                const prevGoldPerGram = gold.prevClose / 31.1;
                const prevGoldTRY = prevGoldPerGram * usdPrev;

                results.push({
                    symbol: 'XAUTRYG',
                    price: goldTRY,
                    change: goldTRY - prevGoldTRY,
                    changePercent: ((goldTRY - prevGoldTRY) / prevGoldTRY) * 100,
                    success: true
                });
            }

            const silver = quotes.find(q => q?.key === 'SILVER');
            if (silver) {
                const silverPerGram = silver.price / 31.1;
                const silverTRY = silverPerGram * usdPrice;

                const prevSilverPerGram = silver.prevClose / 31.1;
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
