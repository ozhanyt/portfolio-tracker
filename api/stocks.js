// Vercel Serverless Function: Stock Price Fetcher
// Endpoint: /api/stocks?symbols=THYAO.IS,GARAN.IS&foreign=false

// In-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
    // CORS headers
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
        // Check cache
        const cacheKey = `${symbols}-${isForeign}`;
        const cached = cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log('Cache HIT:', cacheKey);
            return res.status(200).json(cached.data);
        }

        console.log('Cache MISS, fetching from Yahoo:', cacheKey);

        // Prepare Yahoo symbols
        const yahooSymbols = symbolList.map(s =>
            isForeign ? s : (s.endsWith('.IS') ? s : `${s}.IS`)
        );

        const symbolsParam = yahooSymbols.join(',');
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://finance.yahoo.com/',
                'Origin': 'https://finance.yahoo.com'
            }
        });

        if (!response.ok) {
            throw new Error(`Yahoo API error: ${response.status}`);
        }

        const data = await response.json();
        const quotes = data.quoteResponse?.result || [];

        // Map to our format
        const results = symbolList.map(originalSymbol => {
            const yahooSymbol = isForeign ? originalSymbol : (originalSymbol.endsWith('.IS') ? originalSymbol : `${originalSymbol}.IS`);
            const quote = quotes.find(q => q.symbol === yahooSymbol);

            if (quote) {
                return {
                    code: originalSymbol,
                    currentPrice: quote.regularMarketPrice,
                    prevClose: quote.regularMarketPreviousClose,
                    success: true
                };
            } else {
                return {
                    code: originalSymbol,
                    success: false,
                    error: 'Not found in Yahoo response'
                };
            }
        });

        // Cache the result
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
