/**
 * Market verilerini günceller (USDTRY, BIST100, BTC, Altın, Gümüş, TEFAS Fonları, Hisseler)
 * Quota Optimization: Batching + Caching included.
 */
function marketGuncelle() {
  Logger.log("=== Market Güncelleme Başladı ===");
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Market");
  if (!sheet) {
    Logger.log("'Market' sayfası bulunamadı!");
    return;
  }

  const cache = CacheService.getScriptCache();
  const currencies = [
    { code: "TRY=X", name: "USDTRY", row: 2 },
    { code: "EURTRY=X", name: "EURTRY", row: 7 },
    { code: "CHFTRY=X", name: "CHFTRY", row: 8 },
    { code: "CADTRY=X", name: "CADTRY", row: 9 },
    { code: "DKKTRY=X", name: "DKKTRY", row: 10 },
    { code: "NOKTRY=X", name: "NOKTRY", row: 11 },
    { code: "GBPTRY=X", name: "GBPTRY", row: 12 }
  ];

  // 1. Piyasa Göstergelerini Çek (Batch)
  const coreSymbols = [...currencies.map(c => c.code), "XU100.IS", "BTC-USD", "GC=F", "SI=F"];
  const coreData = fetchYahooBatch(coreSymbols);
  
  const usdData = coreData["TRY=X"];
  const usdRate = usdData?.price;

  // Kurları Yaz
  currencies.forEach(curr => {
    const data = coreData[curr.code];
    if (data && data.price) {
      Logger.log(`${curr.name} Yazılıyor: ${data.price} (Satır ${curr.row})`);
      sheet.getRange(curr.row, 1).setValue(curr.name);
      sheet.getRange(curr.row, 2).setValue(data.price);
      sheet.getRange(curr.row, 3).setValue(data.changePercent);
    }
  });

  // Diğer piyasa verilerini kaydırabiliriz veya sabit satırlara yazabiliriz.
  // Mevcut yapıda BIST100 (3), BTC (4), Altın (5), Gümüş (6) satırlarında.
  // Bu satırları koruyalım.

  // BIST100 Yaz
  if (coreData["XU100.IS"] && coreData["XU100.IS"].price !== null) {
    sheet.getRange(3, 2).setValue(coreData["XU100.IS"].price);
    sheet.getRange(3, 3).setValue(coreData["XU100.IS"].changePercent);
  }

  // Bitcoin Yaz
  if (coreData["BTC-USD"] && coreData["BTC-USD"].price !== null) {
    sheet.getRange(4, 2).setValue(coreData["BTC-USD"].price);
    sheet.getRange(4, 3).setValue(coreData["BTC-USD"].changePercent);
  }

  // Gram Altın Hesapla ve Yaz (GC=F)
  if (usdTryRate && coreData["GC=F"] && coreData["GC=F"].price !== null) {
    const gold = coreData["GC=F"];
    const gramAltinTL = ((gold.price - 32) / 31.1035) * usdTryRate;
    sheet.getRange(5, 2).setValue(gramAltinTL);
    sheet.getRange(5, 3).setValue(gold.changePercent);
  }

  // Gram Gümüş Hesapla ve Yaz (SI=F)
  if (usdTryRate && coreData["SI=F"] && coreData["SI=F"].price !== null) {
    const silver = coreData["SI=F"];
    const gramGumusTL = ((silver.price - 0.55) / 31.1035) * usdTryRate;
    sheet.getRange(6, 2).setValue(gramGumusTL);
    sheet.getRange(6, 3).setValue(silver.changePercent);
  }

  // 2. TEFAS Fonları (Satır 7'den itibaren)
  const fonlar = [
    { kod: "ADP", satir: 8, tip: "YAT" },
    { kod: "DOH", satir: 9, tip: "YAT" },
    { kod: "THV", satir: 10, tip: "YAT" },
    { kod: "AN1", satir: 11, tip: "YAT" },
    { kod: "DL2", satir: 12, tip: "YAT" },
    { kod: "TP2", satir: 13, tip: "YAT" },
    { kod: "TLV", satir: 14, tip: "YAT" },
    { kod: "TLY", satir: 15, tip: "YAT" },
    { kod: "TMM", satir: 16, tip: "YAT" },  
    { kod: "TRJ", satir: 17, tip: "YAT" },
    { kod: "TRU", satir: 18, tip: "YAT" },  
    { kod: "YEF", satir: 19, tip: "YAT" },  
    { kod: "THF", satir: 20, tip: "YAT" }, 
  ];

  fonlar.forEach(fon => {
    try {
      const tefasData = fetchTefasFundPrice(fon.kod, fon.tip);
      if (tefasData.success) {
        sheet.getRange(fon.satir, 1).setValue(fon.kod); // A: Fon Kodu
        sheet.getRange(fon.satir, 2).setValue(tefasData.name); // B: Unvan
        sheet.getRange(fon.satir, 3).setValue(tefasData.price); // C: Fiyat
        sheet.getRange(fon.satir, 4).setValue(tefasData.changePercent / 100); // D: Getiri % (Decimal for percent format)
        // E sütununa Önceki Fiyatı yazalım (Opsiyonel: Eğer E sütununda başlık varsa 7. satırdan sonra başla)
        sheet.getRange(fon.satir, 5).setValue(tefasData.prevPrice); // E: Önceki Fiyat
      }
      Utilities.sleep(200); // Minor throttle, much faster than before
    } catch (e) {
      Logger.log(`${fon.kod} hatası: ${e.message}`);
    }
  });

  // 3. Hisse Fiyatları (Batch Update)
  hisseFiyatlariGuncelleBatch(sheet);
  
  Logger.log("=== Market Güncelleme Bitti ===");
}

/**
 * Yahoo Finance v7 Batch API
 * Maximum 20-30 symbols at once recommended
 */
function fetchYahooBatch(symbols) {
  if (!symbols || symbols.length === 0) return {};
  
  const cache = CacheService.getScriptCache();
  const results = {};
  const toFetch = [];

  // Check cache first
  symbols.forEach(s => {
    const cached = cache.get("YF_" + s);
    if (cached) {
      results[s] = JSON.parse(cached);
    } else {
      toFetch.push(s);
    }
  });

  if (toFetch.length === 0) return results;

  // Yahoo Quote API (v7 supports multiple symbols)
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${toFetch.join(",")}`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return results;

    const data = JSON.parse(response.getContentText());
    if (data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(quote => {
        const item = {
          price: quote.regularMarketPrice,
          changePercent: quote.regularMarketChangePercent,
          previousClose: quote.regularMarketPreviousClose
        };
        results[quote.symbol] = item;
        // Cache for 10 minutes (600 seconds)
        cache.put("YF_" + quote.symbol, JSON.stringify(item), 600);
      });
    }
  } catch (e) {
    Logger.log("Yahoo Batch hatası: " + e.message);
  }

  return results;
}

/**
 * Hisse listesini toplu halde günceller
 */
function hisseFiyatlariGuncelleBatch(sheet) {
  const startRow = 2;
  const maxRows = 100;
  const stockCodes = sheet.getRange(startRow, 6, maxRows, 1).getValues().flat();
  const validSymbols = stockCodes.map(s => String(s).trim()).filter(s => s !== "");
  
  if (validSymbols.length === 0) return;

  // Yahoo 20-30 sembol sınırını aşmamak için chunk'lara bölüyoruz
  const chunks = [];
  const chunkSize = 20;
  for (let i = 0; i < validSymbols.length; i += chunkSize) {
    chunks.push(validSymbols.slice(i, i + chunkSize));
  }

  chunks.forEach((chunk, index) => {
    Logger.log(`Hisse Batch ${index + 1} çekiliyor...`);
    const data = fetchYahooBatch(chunk);
    
    // Değerleri sayfaya yaz (F=6, G=7, H=8)
    // Tek tek setValue yerine array hazırlayıp setValues kullanmak da bir seçenek ama 
    // mevcut yapıya sadık kalarak sadece network'ü batchliyoruz.
    chunk.forEach((symbol, i) => {
      const quote = data[symbol];
      if (quote && quote.price !== null) {
        const row = 0;
        // stockCodes'daki orijinal index'i bulalım (boşluklar dahil)
        const originalIndex = stockCodes.indexOf(symbol);
        if (originalIndex !== -1) {
          const targetRow = startRow + originalIndex;
          sheet.getRange(targetRow, 7).setValue(quote.previousClose); // G: Prev Close
          sheet.getRange(targetRow, 8).setValue(quote.price);         // H: Price
        }
      }
    });
    Utilities.sleep(200);
  });
}

/**
 * TEFAS Fon Fiyatı ve Önceki Fiyat (Cachli + Prev Price)
 */
function fetchTefasFundPrice(fundCode, fundType = "YAT") {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("TEFAS_" + fundCode);
  if (cached) return JSON.parse(cached);

  const today = new Date();
  const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
  const formatDate = (date) => Utilities.formatDate(date, "GMT+3", "dd.MM.yyyy");
  
  const startDate = formatDate(yesterday);
  const endDate = formatDate(today);
  
  try {
    const apiUrl = "https://www.tefas.gov.tr/api/DB/GetAllFundAnalyzeData";
    const payload = { 'fonTip': fundType, 'fonKod': fundCode, 'bastarih': startDate, 'bittarih': endDate };
    const options = {
      'method': 'post',
      'contentType': 'application/x-www-form-urlencoded',
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win32; x86) AppleWebkit/537.36',
        'Referer': 'https://www.tefas.gov.tr/FonAnaliz.aspx',
        'X-Requested-With': 'XMLHttpRequest'
      },
      'payload': payload,
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    if (response.getResponseCode() !== 200) return { success: false };
    
    const json = JSON.parse(response.getContentText());
    if (!json.fundInfo || json.fundInfo.length === 0) return { success: false };
    
    const fundData = json.fundInfo[0];
    const currentPrice = parseFloat(fundData.SONFIYAT);
    const dailyReturn = parseFloat(fundData.GUNLUKGETIRI || 0);

    // Önceki Fiyat Hesaplama: P_prev = P_now / (1 + Return/100)
    const prevPrice = currentPrice / (1 + (dailyReturn / 100));

    const result = {
      success: true,
      name: fundData.FONUNVAN || fundCode,
      price: currentPrice,
      prevPrice: prevPrice,
      changePercent: dailyReturn
    };

    cache.put("TEFAS_" + fundCode, JSON.stringify(result), 900); // 15 dk cache
    return result;
  } catch (e) {
    Logger.log(`${fundCode} TEFAS hatası: ${e.message}`);
    return { success: false };
  }
}
