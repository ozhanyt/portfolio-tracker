/**
 * Yahoo Finance Proxy for Portfolio Tracker
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Google Apps Script'e git: https://script.google.com
 * 2. "New Project" tıkla
 * 3. Bu kodu yapıştır
 * 4. "Deploy" > "New Deployment" tıkla
 * 5. Type: "Web app" seç
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone"
 * 8. "Deploy" tıkla
 * 9. Çıkan URL'yi kopyala ve portfolio-tracker projesinde kullan
 * 
 * QUOTA LIMITS (Free Tier):
 * - URL Fetch: 20,000 calls/day
 * - Execution time: 6 minutes/execution
 * 
 * This proxy helps bypass CORS and rate limiting issues with Yahoo Finance API
 */

function doGet(e) {
    try {
        const params = e.parameter

        // Type 1: Intraday Chart Data (5-minute intervals)
        if (params.type === 'intraday') {
            const symbol = params.symbol
            const interval = params.interval || '5m'
            const range = params.range || '1d'

            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`

            const response = UrlFetchApp.fetch(url, {
                muteHttpExceptions: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })

            return ContentService
                .createTextOutput(response.getContentText())
                .setMimeType(ContentService.MimeType.JSON)
        }

        // Type 2: Batch Quote (current price + previous close)
        if (params.symbols) {
            const symbols = params.symbols.split(',')
            const results = []

            for (let symbol of symbols) {
                try {
                    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.trim()}?interval=1d&range=5d`

                    const response = UrlFetchApp.fetch(url, {
                        muteHttpExceptions: true,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    })

                    const data = JSON.parse(response.getContentText())
                    const result = data?.chart?.result?.[0]

                    if (result && result.meta) {
                        results.push({
                            code: symbol.trim(),
                            currentPrice: result.meta.regularMarketPrice || result.meta.previousClose,
                            prevClose: result.meta.previousClose || result.meta.chartPreviousClose,
                            success: true
                        })
                    } else {
                        results.push({
                            code: symbol.trim(),
                            success: false,
                            error: 'No data found'
                        })
                    }
                } catch (err) {
                    results.push({
                        code: symbol.trim(),
                        success: false,
                        error: err.message
                    })
                }
            }

            return ContentService
                .createTextOutput(JSON.stringify(results))
                .setMimeType(ContentService.MimeType.JSON)
        }

        // Invalid request
        return ContentService
            .createTextOutput(JSON.stringify({ error: 'Invalid parameters. Use type=intraday or symbols=SYMBOL1,SYMBOL2' }))
            .setMimeType(ContentService.MimeType.JSON)

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({
                error: error.message,
                stack: error.stack
            }))
            .setMimeType(ContentService.MimeType.JSON)
    }
}
