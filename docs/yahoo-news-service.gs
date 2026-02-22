/**
 * Yahoo Finance Haber API ve Otomasyonu
 * 
 * Bu script hem arka planda haberleri çeker hem de Web App olarak dışarıya JSON API sunar.
 */

const TICKERS = ["AMZN", "NVO", "MU", "ZETA", "PATH", "RKLB", "IREN", "NBIS", "ASTS", "ONDS"];
const LOGO_URLS = {
  "AMZN": "https://s3-symbol-logo.tradingview.com/amazon--big.svg",
  "NVO": "https://s3-symbol-logo.tradingview.com/novo-nordisk--big.svg",
  "MU": "https://s3-symbol-logo.tradingview.com/micron-technology--big.svg",
  "ZETA": "https://s3-symbol-logo.tradingview.com/zeta--big.svg",
  "PATH": "https://s3-symbol-logo.tradingview.com/uipath--big.svg",
  "RKLB": "https://s3-symbol-logo.tradingview.com/rocket-lab--big.svg",
  "IREN": "https://s3-symbol-logo.tradingview.com/iris-energy--big.svg",
  "NBIS": "https://s3-symbol-logo.tradingview.com/nebius-group-nv--big.svg",
  "ASTS": "https://s3-symbol-logo.tradingview.com/ast-spacemobile--big.svg",
  "ONDS": "https://s3-symbol-logo.tradingview.com/ondas--big.svg"
};

const SHEET_NAME = "Haberler";

// --- API ---
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // Hata durumunda boş yapı dön
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ news: [], quotes: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Performans için limit: Sadece en son 60 haberi çek
  const MAX_NEWS_ITEMS = 60;
  const lastRow = Math.min(sheet.getLastRow(), MAX_NEWS_ITEMS + 1); 
  
  // Veri yoksa veya sadece başlık varsa
  if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({ news: [], quotes: [] })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  const headers = data.shift();
  
  // 2. Trend Analizi (Haber Sağanağı)
  const trendMap = calculateTrends(sheet);

  // 3. Haberleri Çıkar
  const newsItems = data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      let cleanHeader = header.replace(/\s+/g, '').replace(/[^\w\s]/gi, ''); 
      if (header === "Ticker") cleanHeader = "ticker";
      if (header === "Zaman") cleanHeader = "time";
      if (header === "Resim") cleanHeader = "image";
      if (header === "Başlık (TR)") cleanHeader = "title_tr";
      if (header === "Özet (TR)") cleanHeader = "desc_tr";
      if (header === "Duygu") cleanHeader = "sentiment";
      if (header === "Link") cleanHeader = "link";
      if (header === "Orijinal Başlık") cleanHeader = "title_en";
      if (header === "Logo") cleanHeader = "logo";
      
      obj[cleanHeader] = row[index];
    });
    // Trend bayrağını ekle
    obj.isTrending = trendMap[obj.ticker] || false;
    return obj;
  });

  // 4. Anlık Fiyatları Al (Tüm Tickerlar için)
  const quotesMap = getQuotesFromSheet(ss);
  
  // Quotes Array'e çevir (Marquee için)
  const quotesList = TICKERS.map(ticker => {
    const q = quotesMap[ticker] || { price: 0, change: 0 };
    return {
      ticker: ticker,
      price: q.price,
      change: q.change,
      logo: LOGO_URLS[ticker] || ""
    };
  });

  // 5. Haberlere Fiyat Ekle
  const enrichedNews = newsItems.map(item => {
    const quote = quotesMap[item.ticker];
    if (quote) {
      item.price = quote.price;
      item.change = quote.change;
    } else {
      item.price = 0;
      item.change = 0;
    }
    return item;
  });
  
  const response = {
    news: enrichedNews,
    quotes: quotesList
  };
  
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

// ... (setup function remains) ...

// --- TREND ANALİZİ ---
function calculateTrends(sheet) {
  // Tüm geçmiş veriyi çek (Ticker ve Zaman sütunları: A ve B)
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues(); // [Ticker, ZamanString]
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  const stats = {};
  
  values.forEach(row => {
    const ticker = row[0];
    const timeStr = row[1]; // yyyy-MM-dd'T'HH:mm:ss formatında
    
    if (!stats[ticker]) {
      stats[ticker] = { totalInfos: 0, recentInfos: 0, firstDate: now.getTime() };
    }
    
    // Tarihi parse et
    // timeStr formati: "2025-01-03T15:45:00" -> Date object
    // Apps Script 'new Date()' ISO stringi genelde tanır.
    let newsDate = new Date(timeStr);
    
    // Geçersiz tarihse atla
    if (isNaN(newsDate.getTime())) return;
    
    stats[ticker].totalInfos++;
    
    // En eski tarihi bul (Ortalama hesaplamak için)
    if (newsDate.getTime() < stats[ticker].firstDate) {
      stats[ticker].firstDate = newsDate.getTime();
    }
    
    // Son 24 saat kontrolü
    if (now - newsDate < oneDayMs) {
      stats[ticker].recentInfos++;
    }
  });
  
  const trendMap = {};
  
  for (const ticker in stats) {
    const s = stats[ticker];
    
    // Veri çok yeniyse (ör: sadece bugünün verisi varsa) ADV hesaplamak yanıltıcı olabilir.
    // En azından 1 günden eski verimiz varsa ADV hesapla, yoksa direkt recent'a bak.
    const daysSinceFirst = Math.max(1, (now.getTime() - s.firstDate) / oneDayMs);
    const avgDailyVolume = s.totalInfos / daysSinceFirst;
    
    // TREND KURALI:
    // 1. Son 24 saatte en az 3 haber olmalı (Gürültüyü önlemek için)
    // 2. Son 24 saatteki haber sayısı, ortalamanın 1.5 katından fazla olmalı.
    
    if (s.recentInfos >= 3 && s.recentInfos >= (avgDailyVolume * 1.5)) {
      trendMap[ticker] = true;
    }
  }
  
  return trendMap;
}

// --- KURULUM ---
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Haberler Sayfası Kurulumu
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Ticker", "Zaman", "Resim", "Başlık (TR)", "Özet (TR)", "Duygu", "Link", "Orijinal Başlık", "Logo"]);
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  } else {
    // Resim sütunu kontrolü
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes("Resim")) {
       sheet.getRange(1, 3).insertCells(SpreadsheetApp.Dimension.COLUMNS);
       sheet.getRange(1, 3).setValue("Resim").setFontWeight("bold").setBackground("#f3f3f3");
    }
  }

  // 2. Fiyatlar Sayfası Kurulumu (GOOGLEFINANCE formülleriyle)
  let priceSheet = ss.getSheetByName("Fiyatlar");
  if (!priceSheet) {
    priceSheet = ss.insertSheet("Fiyatlar");
    priceSheet.appendRow(["Ticker", "Fiyat", "Değişim (%)"]);
    priceSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#e6f7ff");
    
    // Her ticker için formülleri ekle
    TICKERS.forEach(ticker => {
      priceSheet.appendRow([ticker, `=GOOGLEFINANCE("${ticker}", "price")`, `=GOOGLEFINANCE("${ticker}", "changepct")`]);
    });
    Logger.log("Fiyatlar sayfası oluşturuldu ve formüller eklendi.");
  }
}

// --- YARDIMCI: Fiyatları Sayfadan Okuma ---
function getQuotesFromSheet(ss) {
  let priceSheet = ss.getSheetByName("Fiyatlar");
  if (!priceSheet) {
    // Eğer yoksa (örn: kullanıcı setup çalıştırmadıysa) manual oluşturmayı dene veya boş dön
    return {}; 
  }

  const lastRow = priceSheet.getLastRow();
  if (lastRow < 2) return {};

  const values = priceSheet.getRange(2, 1, lastRow - 1, 3).getValues(); // [Ticker, Price, Change]
  let quoteMap = {};

  values.forEach(row => {
    const ticker = row[0];
    const price = row[1];
    const change = row[2];
    
    // GoogleFinance bazen "Loading..." veya hata dönebilir, kontrol et
    if (typeof price === 'number') {
       quoteMap[ticker] = {
         price: price,
         change: change
       };
    }
  });

  return quoteMap;
}

// --- VERİ ÇEKME ---
function fetchAndProcessNews() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { setup(); sheet = ss.getSheetByName(SHEET_NAME); }

  const lastRow = sheet.getLastRow();
  let existingLinks = [];
  if (lastRow > 1) {
    // ["Ticker", "Zaman", "Resim", "Başlık (TR)", "Özet (TR)", "Duygu", "Link", "Orijinal Başlık", "Logo"]
    // Link = 7. Sütun.
    // DİKKAT: Mükerrer kaydı kesin önlemek için TÜM linkleri kontrol ediyoruz (Performans için sadece link sütununu çekiyoruz)
    const data = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
    existingLinks = data.flat();
  }

  TICKERS.forEach(ticker => {
    try {
      const newsItems = getYahooNews(ticker);
      const logoUrl = LOGO_URLS[ticker] || "";
      
      newsItems.forEach(item => {
        if (!existingLinks.includes(item.link)) {
          const translatedTitle = translateText(item.title);
          let translatedDesc = item.description ? translateText(item.description) : "";
          translatedDesc = trimToLastSentence(translatedDesc);
          
          const sentiment = analyzeSentiment(item.title + " " + item.description);
          
          sheet.appendRow([
            ticker,
            item.pubDate,
            item.imageUrl, 
            translatedTitle,
            translatedDesc,
            sentiment,
            item.link,
            item.title,
            logoUrl
          ]);
          existingLinks.push(item.link);
        }
      });
    } catch (e) {
      Logger.log("Hata (" + ticker + "): " + e.toString());
    }
  });

  // Sıralama (Zaman sütunu 2. sütun)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).sort({column: 2, ascending: false});
  }
}

function getYahooNews(ticker) {
  // Yahoo Finance RSS Feed
  const url = 'https://finance.yahoo.com/rss/headline?s=' + ticker;
  const xml = UrlFetchApp.fetch(url).getContentText();
  const document = XmlService.parse(xml);
  const root = document.getRootElement();
  const channel = root.getChild('channel');
  const items = channel.getChildren('item');
  
  const newsList = [];
  const mediaNs = XmlService.getNamespace('media', 'http://search.yahoo.com/mrss/');
  
  items.forEach(item => {
    const title = item.getChild('title').getText();
    const link = item.getChild('link').getText();
    const pubDate = item.getChild('pubDate').getText();
    const description = item.getChild('description') ? item.getChild('description').getText() : "";
    
    let imageUrl = "";
    
    // Yöntem 1: Media Content Tag'i
    const mediaContent = item.getChild('content', mediaNs);
    if (mediaContent) {
      imageUrl = mediaContent.getAttribute('url').getValue();
    }
    
    // Yöntem 2: Description içinden Regex ile resim bulma (Fallback)
    if (!imageUrl && description) {
       const imgRegex = /<img[^>]+src="([^">]+)"/g;
       const match = imgRegex.exec(description);
       if (match && match[1]) {
         imageUrl = match[1];
       }
    }
    
    // Yöntem 2: Description içinden Regex ile resim bulma (Fallback)
    if (!imageUrl && description) {
       const imgRegex = /<img[^>]+src="([^">]+)"/g;
       const match = imgRegex.exec(description);
       if (match && match[1]) {
         imageUrl = match[1];
       }
    }
    
    // Yöntem 3: Linkten OG Image Çekme (En son çare - Biraz yavaş olabilir ama kesindir)
    if (!imageUrl && link) {
       imageUrl = fetchOgImage(link);
    }
    
    newsList.push({
      title: title,
      link: link,
      pubDate: formatDate(new Date(pubDate)),
      description: cleanHtml(description),
      imageUrl: imageUrl
    });
  });
  
  return newsList;
}

// Helper: Open Graph Resim Çekici
function fetchOgImage(url) {
  try {
    const html = UrlFetchApp.fetch(url, {muteHttpExceptions: true}).getContentText();
    // og:image meta tagini bul
    const match = /<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i.exec(html);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    // Hata olursa boş dön
  }
  return "";
}

function loadTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  
  sheet.clearContents();
  sheet.appendRow(["Ticker", "Zaman", "Resim", "Başlık (TR)", "Özet (TR)", "Duygu", "Link", "Orijinal Başlık", "Logo"]);
  
  // Kullanıcının özel hisseleri için örnek veriler (Haftasonu durumunda fallback olarak)
  // NOT: Özet kısımları "Popup" ekranında dolgun görünmesi için uzun tutulmuştur.
  const testData = [
    [
      "ZETA", 
      "03.01.2025 15:45", 
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80", 
      "Zeta Global Yapay Zeka Pazarlamasında Liderliğe Oynuyor", 
      "Zeta Global, bugün yaptığı açıklamada yapay zeka tabanlı yeni pazarlama platformu 'Zeta AI Cloud'un lansmanını duyurdu.\n\nBu yeni platform, markaların müşteri davranışlarını %40 daha isabetli tahmin etmesini sağlıyor. CEO David Steinberg, 'Bu teknoloji ile pazarlama dünyasında oyunun kurallarını yeniden yazıyoruz' dedi. Yatırımcıların ilgisiyle hisseler günü %5 yükselişle tamamladı.", 
      "OLUMLU", 
      "https://finance.yahoo.com/quote/ZETA", 
      "Zeta Global Leads AI Marketing", 
      LOGO_URLS["ZETA"]
    ],
    [
      "PATH", 
      "03.01.2025 14:20", 
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80", 
      "UiPath Otomasyon Çözümleri İçin Microsoft ile Masada", 
      "Robotik Süreç Otomasyonu (RPA) devi UiPath, Microsoft Azure entegrasyonunu derinleştirmek için stratejik bir ortaklık imzaladı.\n\nAnlaşma kapsamında UiPath'in otomasyon botları, Microsoft Office 365 uygulamalarıyla doğrudan çalışabilecek. Analistler, bu hamlenin UiPath'in kurumsal pazar payını önemli ölçüde artıracağını öngörüyor.", 
      "OLUMLU", 
      "https://finance.yahoo.com/quote/PATH", 
      "UiPath Partners with Microsoft", 
      LOGO_URLS["PATH"]
    ],
    [
      "RKLB", 
      "03.01.2025 12:10", 
      "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=600&q=80", 
      "Rocket Lab Neutron Roketini Başarıyla Test Etti", 
      "Uzay taşımacılığında SpaceX'in en büyük rakiplerinden biri olan Rocket Lab, yeni nesil Neutron roketinin statik ateşleme testini başarıyla tamamladı.\n\nYeniden kullanılabilir bu roket, uydu fırlatma maliyetlerini %50 oranında düşürmeyi hedefliyor. Şirket, ilk ticari uçuşun 2026 başında gerçekleşeceğini belirtti.", 
      "OLUMLU", 
      "https://finance.yahoo.com/quote/RKLB", 
      "Rocket Lab Tests Neutron", 
      LOGO_URLS["RKLB"]
    ],
    [
      "IREN", 
      "03.01.2025 10:30", 
      "https://images.unsplash.com/photo-1639322537228-ad7117a7a637?auto=format&fit=crop&w=600&q=80", 
      "Iris Energy Bitcoin Madenciliğinde Kapasite Artırdı", 
      "Yenilenebilir enerji odaklı veri merkezi işletmecisi Iris Energy, Teksas'taki tesisinde kapasitesini 50 MW artırdığını duyurdu.\n\nYeni donanımların devreye girmesiyle şirketin toplam hash gücü rekor seviyeye ulaştı. Yönetim, yaklaşan Bitcoin halving öncesi en verimli madenci olmayı hedeflediklerini vurguladı.", 
      "NÖTR", 
      "https://finance.yahoo.com/quote/IREN", 
      "Iris Energy Expands Capacity", 
      LOGO_URLS["IREN"]
    ],
    [
      "NBIS", 
      "03.01.2025 09:15", 
      "", 
      "Nebius Group Büyüme Hedeflerini Aşağı Yönlü Revize Etti", 
      "Teknoloji altyapı sağlayıcısı Nebius Group, küresel çip tedarik sorunları nedeniyle 2025 yılı büyüme hedeflerini %10 oranında düşürdü.\n\nŞirket CFO'su, 'Tedarik zincirindeki aksamalar kısa vadeli planlarımızı etkiliyor ancak uzun vadeli vizyonumuz değişmedi' açıklamasında bulundu. Haber sonrası hisselerde satış baskısı görüldü.", 
      "OLUMSUZ", 
      "https://finance.yahoo.com/quote/NBIS", 
      "Nebius Revises Targets", 
      LOGO_URLS["NBIS"]
    ],
    [
      "ASTS", 
      "03.01.2025 08:45", 
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80", 
      "AST SpaceMobile Uydudan Doğrudan 5G Bağlantısını Kanıtladı", 
      "BlueWalker 3 uydusu kullanılarak yapılan testlerde, standart bir akıllı telefona doğrudan uzaydan 5G sinyali başarıyla iletildi.\n\nBu teknoloji, dünyanın kapsama alanı dışında kalan bölgelerine internet götürme potansiyeli taşıyor. AT&T ve Vodafone gibi ortaklar testi memnuniyetle karşıladı.", 
      "OLUMLU", 
      "https://finance.yahoo.com/quote/ASTS", 
      "AST SpaceMobile 5G Test", 
      LOGO_URLS["ASTS"]
    ],
    [
      "AMZN", 
      "02.01.2025 18:30", 
      "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&w=600&q=80", 
      "Amazon Lojistik Ağını Tamamen Dijitalleştiriyor", 
      "E-ticaret devi Amazon, depolarında kullanacağı yeni otonom robot serisini tanıttı.\n\nProteus adı verilen bu robotlar, insan çalışanlarla güvenli bir şekilde yan yana çalışabiliyor. Şirket bu hamleyle teslimat sürelerini kısaltmayı ve operasyonel maliyetleri düşürmeyi planlıyor.", 
      "NÖTR", 
      "https://finance.yahoo.com/quote/AMZN", 
      "Amazon Digital Logistics", 
      LOGO_URLS["AMZN"]
    ]
  ];
  
  testData.forEach(row => sheet.appendRow(row));
}

// Yardımcılar
function translateText(text) {
  if (!text) return "";
  try { return LanguageApp.translate(text, 'en', 'tr'); } catch (e) { return text; }
}

function analyzeSentiment(text) {
  const lowerText = text.toLowerCase();
  let score = 0;
  ["surge", "jump", "gain", "profit", "beat", "bull", "strong", "positive"].forEach(w => { if (lowerText.includes(w)) score++; });
  ["fall", "drop", "loss", "miss", "bear", "weak", "negative", "crash"].forEach(w => { if (lowerText.includes(w)) score--; });
  if (score > 0) return "OLUMLU";
  if (score < 0) return "OLUMSUZ";
  return "NÖTR";
}

function cleanHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, '');
}

function formatDate(date) {
  // ISO 8601 Formatı (T ile ayrılmış) - Frontend parsing garantisi için
  return Utilities.formatDate(date, "GMT+3", "yyyy-MM-dd'T'HH:mm:ss");
}

function trimToLastSentence(text) {
  if (!text) return "";
  // Son cümle bitişini bul (. ! ?)
  const lastEnd = Math.max(text.lastIndexOf('.'), text.lastIndexOf('!'), text.lastIndexOf('?'));
  if (lastEnd === -1) return text; // Hiç nokta yoksa olduğu gibi dön
  return text.substring(0, lastEnd + 1);
}

// Mükerrer Kayıtları Temizle (Manuel Çalıştırılabilir)
function removeDuplicates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const uniqueLinks = new Set();
  const cleanedData = [];
  
  // Link sütunu indexi 6 (0-based) -> 7. sütun
  data.forEach(row => {
    const link = row[6];
    if (!uniqueLinks.has(link)) {
      uniqueLinks.add(link);
      cleanedData.push(row);
    }
  });
  
  if (data.length !== cleanedData.length) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    if (cleanedData.length > 0) {
      sheet.getRange(2, 1, cleanedData.length, cleanedData[0].length).setValues(cleanedData);
    }
    Logger.log((data.length - cleanedData.length) + " adet mükerrer kayıt silindi.");
  } else {
    Logger.log("Mükerrer kayıt bulunamadı.");
  }
}

function createTimeDrivenTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => { if (t.getHandlerFunction() === 'fetchAndProcessNews') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('fetchAndProcessNews').timeBased().everyMinutes(10).create();
}
