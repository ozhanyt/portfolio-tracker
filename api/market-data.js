// Vercel Serverless Function: Market Data Fetcher using Twelve Data
// Endpoint: /api/market-data

const TWELVE_DATA_API_KEY = 'ea33416ef7404879958f1fc4e3d3a389';

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
        if (cache.data && (Date.now() - cache.timestamp < CACHE_DURATION)) {
            console.log('Market data cache HIT');
            return res.status(200).json(cache.data);
        }

        console.log('Market data cache MISS, fetching from Twelve Data');

        const symbols = [
            { symbol: 'XU100.IS', key: 'BIST100' },
            { symbol: 'USD/TRY', key: 'USDTRY' },
            { symbol: 'BTC/USD', key: 'BTCUSD' },
            { symbol: 'XAU/USD', key: 'GOLD' },  // Gold in USD per ounce
            { symbol: 'XAG/USD', key: 'SILVER' }  // Silver in USD per ounce
        ];

        const quotes = await Promise.all(
            symbols.map(async ({ symbol, key }) => {
                try {
                    const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;
                    const response = await fetch(url);

                    if (!response.ok) return null;

                    const data = await response.json();

                    if (data.close && data.previous_close) {
                        return {
                            key,
                            price: parseFloat(data.close),
                            prevClose: parseFloat(data.previous_close)
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
                const goldPerGram = gold.price / 31.1;  // Convert ounce to gram
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

        cache.data = results;
        cache.timestamp = Date.now();

        return res.status(200).json(results);

    } catch (error) {
        console.error('Error fetching market data:', error);

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
