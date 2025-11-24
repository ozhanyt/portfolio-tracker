// Vercel Serverless Function: Hybrid Stock Price Fetcher
// Finnhub for foreign stocks, Yahoo Finance for Turkish stocks
// Endpoint: /api/stocks?symbols=THYAO.IS,GARAN.IS&foreign=false

const FINNHUB_API_KEY = 'd4i6egpr01qkv40h4e4gd4i6egpr01qkv40h4e50';

// In-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchFromFinnhub(symbol) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Finnhub error: ${response.status}`);
    }

    const data = await response.json();

    if (data.c && data.pc) {
        return {
            currentPrice: data.c,
            prevClose: data.pc
        };
    }
    throw new Error('No data from Finnhub');
}

async function fetchFromYahoo(symbol) {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://finance.yahoo.com/'
        }
    });

    if (!response.ok) {
        throw new Error(`Yahoo error: ${response.status}`);
    }

    const data = await response.json();
    const quote = data.quoteResponse?.result?.[0];

    if (quote && quote.regularMarketPrice) {
        return {
            currentPrice: quote.regularMarketPrice,
            prevClose: quote.regularMarketPreviousClose
        };
    }
    throw new Error('No data from Yahoo');
}

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

        console.log('Cache MISS, fetching:', cacheKey);

        // Fetch each symbol
        const results = await Promise.all(
            symbolList.map(async (originalSymbol) => {
                try {
                    let priceData;

                    if (isForeign) {
                        // Use Finnhub for foreign stocks
                        priceData = await fetchFromFinnhub(originalSymbol);
                    } else {
                        // Use Yahoo for Turkish stocks
                        const yahooSymbol = originalSymbol.endsWith('.IS') ? originalSymbol : `${originalSymbol}.IS`;
                        priceData = await fetchFromYahoo(yahooSymbol);
                    }

                    return {
                        code: originalSymbol,
                        currentPrice: priceData.currentPrice,
                        prevClose: priceData.prevClose,
                        success: true
                    };
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
