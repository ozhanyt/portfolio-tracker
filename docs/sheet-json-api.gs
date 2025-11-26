/**
 * Google Sheets to JSON API
 * 
 * Bu script Google Sheets'teki AFT tabındaki verileri JSON API olarak sunar.
 * React uygulaması Yahoo Finance yerine bu API'yi çağırır, böylece quota sorunu ortadan kalkar.
 * 
 * KURULUM:
 * 1. Google Sheet'ini aç
 * 2. Uzantılar > Apps Script
 * 3. Bu kodu yapıştır
 * 4. Deploy > New Deployment
 * 5. Type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Deploy
 * 9. Çıkan URL'yi React projesinde kullan
 * 
 * API ENDPOINTS:
 * - GET ?fund=AFT           → AFT sayfasındaki tüm hisse verileri
 * - GET ?symbol=TERA        → Tek bir hisse verisi
 * - GET ?symbols=TERA,THYAO → Birden fazla hisse verisi (virgülle ayrılmış)
 */

function doGet(e) {
  try {
    const params = e.parameter;
    
    // MARKET DATA İSTEĞİ
    if (params.market) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Market');
      if (!sheet) {
        return createJsonResponse({ error: 'Market sheet not found' }, 404);
      }
      
      const data = sheet.getRange(2, 1, 5, 3).getValues(); // A2:C6 (5 satır, 3 sütun)
      const marketData = [];
      
      data.forEach(row => {
        const symbol = String(row[0]).trim();
        if (symbol) {
          marketData.push({
            symbol: symbol,
            price: parseNumber(row[1]),
            changePercent: parseNumber(row[2])
          });
        }
      });
      
      return createJsonResponse(marketData);
    }
    
    // EĞER FUND PARAMETRESİ YOKSA TÜM SHEET'LERİ ÇEK
    if (!params.fund) {
      const allFunds = ['TLY', 'DFI', 'BOS', 'AFT'];
      const allResults = [];
      
      allFunds.forEach(fundName => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(fundName);
        if (sheet) {
          const data = getAllStockData(sheet);
          // Her hisseye fund bilgisini ekle
          data.forEach(item => {
            item.fund = fundName;
          });
          allResults.push(...data);
        }
      });
      
      return createJsonResponse(allResults);
    }
    
    // BELİRLİ BİR FUND İSTENDİYSE
    const fund = params.fund;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(fund);
    if (!sheet) {
      return createJsonResponse({ error: `Sheet "${fund}" not found` }, 404);
    }
    
    // Eğer tek bir symbol isteniyorsa
    if (params.symbol) {
      const data = getStockData(sheet, params.symbol);
      data.fund = fund; // Fund bilgisini ekle
      return createJsonResponse(data);
    }
    
    // Eğer birden fazla symbol isteniyorsa (virgülle ayrılmış)
    if (params.symbols) {
      const symbols = params.symbols.split(',').map(s => s.trim());
      const results = symbols.map(symbol => {
        const data = getStockData(sheet, symbol);
        data.fund = fund;
        return data;
      });
      return createJsonResponse(results);
    }
    
    // Hiçbir parametre yoksa tüm veriyi dön
    const allData = getAllStockData(sheet);
    return createJsonResponse(allData);
    
  } catch (error) {
    return createJsonResponse({
      error: error.message,
      stack: error.stack
    }, 500);
  }
}

/**
 * Tek bir hisse verisini al
 */
function getStockData(sheet, symbol) {
  const lastRow = sheet.getLastRow();
  
  // B sütunu = Hisse Kodu
  const codes = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
  
  // Hisseyi bul
  const rowIndex = codes.findIndex(code => String(code).trim().toUpperCase() === symbol.toUpperCase());
  
  if (rowIndex === -1) {
    return {
      code: symbol,
      success: false,
      error: 'Symbol not found'
    };
  }
  
  const actualRow = rowIndex + 2; // 0-indexed + header row
  
  // Sütunları al (B=2, D=4, E=5, F=6)
  // B: Hisse Kodu
  // D: Adet
  // E: Önceki Kapanış
  // F: Bugünkü Fiyat
  
  const rowData = sheet.getRange(actualRow, 2, 1, 5).getValues()[0];
  
  return {
    code: String(rowData[0]).trim(),
    currentPrice: parseNumber(rowData[4]),  // F sütunu (6-2=4, 0-indexed)
    prevClose: parseNumber(rowData[3]),     // E sütunu (5-2=3)
    quantity: parseNumber(rowData[2]),      // D sütunu (4-2=2)
    success: true
  };
}

/**
 * Tüm hisse verilerini al
 */
function getAllStockData(sheet) {
  const lastRow = sheet.getLastRow();
  
  // Tüm veriyi al (2. satırdan başla, başlık hariç)
  // B:F sütunları (Hisse Kodu, ?, Adet, Önceki Kapanış, Bugünkü Fiyat)
  const data = sheet.getRange(2, 2, lastRow - 1, 5).getValues();
  
  const results = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const code = String(row[0]).trim();
    
    // Boş satırları atla
    if (!code || code === '' || code === '#N/A') continue;
    
    results.push({
      code: code,
      currentPrice: parseNumber(row[4]),  // F sütunu
      prevClose: parseNumber(row[3]),     // E sütunu
      quantity: parseNumber(row[2]),      // D sütunu
      success: true
    });
  }
  
  return results;
}

/**
 * Sayıyı parse et (Türkçe formatı destekler: 1.234,56)
 */
function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (!value || value === '') return null;
  
  // String'i temizle: Binlik ayracı noktaları çıkar, virgülü noktaya çevir
  const cleaned = String(value)
    .replace(/\./g, '')      // 1.234 -> 1234
    .replace(',', '.');      // 1234,56 -> 1234.56
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * JSON response oluştur
 */
function createJsonResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // CORS header ekle (React'ten erişim için)
  if (statusCode !== 200) {
    // Apps Script'te HTTP status code set edilemiyor, sadece header'da belirtilebilir
    return output;
  }
  
  return output;
}
