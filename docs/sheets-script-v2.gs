/**
 * Market Verilerini Güncelleme Scripti (Tam & Kararlı Versiyon)
 * - Kurlar: Satır 2 ve 7-12 arası (USD, EUR, CHF, CAD, DKK, NOK, GBP)
 * - Göstergeler: BIST100(3), BTC(4), Altın(5), Gümüş(6)
 * - TEFAS: Satır 20'den itibaren
 * - Hisseler: F Sütununda (F2:F101) listelenir, fiyatlar E ve F Sütunlarına yazılır.
 */
function marketGuncelle() {
  Logger.log("=== Market Güncelleme Başladı ===");
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Market");
  if (!sheet) {
    Logger.log("Hata: 'Market' sayfası bulunamadı!");
    return;
  }

  // 1. DÖVİZ KURLARI (Dikey Düzen: 2-12 Satır)
  const currencies = [
    { code: "TRY=X", name: "USDTRY", row: 2 },
    { code: "EURTRY=X", name: "EURTRY", row: 7 },
    { code: "CHFTRY=X", name: "CHFTRY", row: 8 },
    { code: "CADTRY=X", name: "CADTRY", row: 9 },
    { code: "DKKTRY=X", name: "DKKTRY", row: 10 },
    { code: "NOKTRY=X", name: "NOKTRY", row: 11 },
    { code: "GBPTRY=X", name: "GBPTRY", row: 12 }
  ];

  let currentUsdTry = 34.50; // Fallback değeri

  Logger.log("Döviz kurları çekiliyor...");
  currencies.forEach(curr => {
    const data = fetchYahooStable(curr.code);
    if (data.price) {
      Logger.log(`${curr.name} -> ${data.price} (Satır ${curr.row})`);
      sheet.getRange(curr.row, 1).setValue(curr.name);
      sheet.getRange(curr.row, 2).setValue(data.price);
      sheet.getRange(curr.row, 3).setValue(data.changePercent / 100);
      if (curr.name === "USDTRY") currentUsdTry = data.price;
    } else {
      Logger.log(`HATA: ${curr.code} verisi alınamadı!`);
    }
  });

  // 2. PİYASA GÖSTERGELERİ (BIST100, BTC, Altın, Gümüş)
  Logger.log("Piyasa göstergeleri çekiliyor...");
  
  // BIST100 (Satır 3)
  const bist = fetchYahooStable("XU100.IS");
  if (bist.price) {
    sheet.getRange(3, 1).setValue("BIST100");
    sheet.getRange(3, 2).setValue(bist.price);
    sheet.getRange(3, 3).setValue(bist.changePercent / 100);
  }

  // BTCUSD (Satır 4)
  const btc = fetchYahooStable("BTC-USD");
  if (btc.price) {
    sheet.getRange(4, 1).setValue("BTCUSD");
    sheet.getRange(4, 2).setValue(btc.price);
    sheet.getRange(4, 3).setValue(btc.changePercent / 100);
  }

  // Gram Altın & GÜmüş (USDTRY baz alınarak hesaplanır)
  if (currentUsdTry) {
    // GRAM ALTIN (Satır 5)
    const goldGlobal = fetchYahooStable("GC=F");
    if (goldGlobal.price) {
      const gramAltinTL = ((goldGlobal.price - 32) / 31.1035) * currentUsdTry;
      sheet.getRange(5, 1).setValue("GOLD_TL");
      sheet.getRange(5, 2).setValue(gramAltinTL);
      sheet.getRange(5, 3).setValue(goldGlobal.changePercent / 100);
    }

    // GRAM GÜMÜŞ (Satır 6)
    const silverGlobal = fetchYahooStable("SI=F");
    if (silverGlobal.price) {
      const gramGumusTL = ((silverGlobal.price - 0.55) / 31.1035) * currentUsdTry;
      sheet.getRange(6, 1).setValue("SILVER_TL");
      sheet.getRange(6, 2).setValue(gramGumusTL);
      sheet.getRange(6, 3).setValue(silverGlobal.changePercent / 100);
    }
  }

  // 3. TEFAS FONLARI (Satır 20'den itibaren)
  tefasGuncelle(sheet);

  // 4. HİSSE FİYATLARI (F Sütunu okunur, E ve F sütunlarına yazılır)
  hisseGuncelle(sheet);

  Logger.log("=== Market Güncelleme Bitti ===");
}

/**
 * TEFAS Fonlarını Güncelleme
 */
function tefasGuncelle(sheet) {
  Logger.log("TEFAS fonları güncelleniyor...");
  const fonlar = [
    "ADP", "DOH", "THV", "AN1", "DL2", "TP2", "TLV", "TLY", "TMM", "TRJ", "TRU", "YEF", "THF", "IOG"
  ];
  const startRow = 20;

  fonlar.forEach((kod, index) => {
    const row = startRow + index;
    try {
      const data = fetchTefasWithCache(kod, "YAT");
      if (data.success) {
        Logger.log(`TEFAS: ${kod} -> ${data.price} (Satır ${row})`);
        sheet.getRange(row, 1).setValue(kod);
        sheet.getRange(row, 2).setValue(data.name);
        sheet.getRange(row, 3).setValue(data.price);
        sheet.getRange(row, 4).setValue(data.changePercent / 100);
        sheet.getRange(row, 5).setValue(data.prevPrice);
      }
      Utilities.sleep(100);
    } catch (e) { }
  });
}

/**
 * Hisse Fiyatlarını Güncelleme (F -> E,F)
 */
function hisseGuncelle(sheet) {
  Logger.log("Hisse fiyatları (F:H) güncelleniyor...");
  const codes = sheet.getRange(2, 6, 100, 1).getValues();
  for (let i = 0; i < codes.length; i++) {
    const sym = String(codes[i][0]).trim();
    if (!sym || sym === "" || sym === "#N/A") continue;
    const data = fetchYahooStable(sym);
    if (data.price) {
      Logger.log(`${sym} -> ${data.price} (Satır ${i+2})`);
      sheet.getRange(i+2, 7).setValue(data.previousClose);
      sheet.getRange(i+2, 8).setValue(data.price);
    }
    Utilities.sleep(50);
  }
}

/**
 * Yahoo Finance v8 (Kararlı Endpoint)
 */
function fetchYahooStable(symbol) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("Y8_" + symbol);
  if (cached) return JSON.parse(cached);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return { price: null };

    const json = JSON.parse(response.getContentText());
    if (!json.chart?.result?.[0]) return { price: null };

    const meta = json.chart.result[0].meta;
    const prev = meta.chartPreviousClose || meta.previousClose;
    const res = {
      price: meta.regularMarketPrice,
      previousClose: prev,
      changePercent: ((meta.regularMarketPrice - prev) / prev) * 100
    };
    
    cache.put("Y8_" + symbol, JSON.stringify(res), 600); // 10 dk cache
    return res;
  } catch (e) {
    return { price: null };
  }
}

/**
 * TEFAS API Sorgusu (Cache'li)
 */
function fetchTefasWithCache(fundCode, fundType) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("TF_" + fundCode);
  if (cached) return JSON.parse(cached);

  const formatDate = (d) => Utilities.formatDate(d, "GMT+3", "dd.MM.yyyy");
  try {
    const payload = { 
      'fonTip': fundType, 
      'fonKod': fundCode, 
      'bastarih': formatDate(new Date(Date.now() - 86400000)), 
      'bittarih': formatDate(new Date()) 
    };
    const response = UrlFetchApp.fetch("https://www.tefas.gov.tr/api/DB/GetAllFundAnalyzeData", {
      'method': 'post',
      'headers': {
        'Referer': 'https://www.tefas.gov.tr/FonAnaliz.aspx',
        'X-Requested-With': 'XMLHttpRequest'
      },
      'payload': payload,
      'muteHttpExceptions': true
    });
    
    const json = JSON.parse(response.getContentText());
    if (json.fundInfo && json.fundInfo.length > 0) {
      const fund = json.fundInfo[0];
      const price = parseFloat(fund.SONFIYAT);
      const ret = parseFloat(fund.GUNLUKGETIRI || 0);
      const res = {
        success: true,
        name: fund.FONUNVAN,
        price: price,
        changePercent: ret,
        prevPrice: price / (1 + (ret / 100))
      };
      cache.put("TF_" + fundCode, JSON.stringify(res), 3600);
      return res;
    }
  } catch (e) {}
  return { success: false };
}
