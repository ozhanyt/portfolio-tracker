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
    
    // SINGLE SYMBOL QUOTE (Market Sheet F2/F3 logic)
    if (params.symbol && !params.fund && !params.market) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Market');
      if (sheet) {
        sheet.getRange('F2').setValue(params.symbol);
        SpreadsheetApp.flush(); // Ensure formulas update
        const price = parseNumber(sheet.getRange('F3').getValue());
        return createJsonResponse({
          symbol: params.symbol,
          price: price,
          success: true
        });
      }
    }
    
    // MARKET DATA İSTEĞİ
    if (params.market) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Market');
      if (!sheet) {
        return createJsonResponse({ error: 'Market sheet not found' }, 404);
      }
      
      const lastRow = sheet.getLastRow() > 16 ? 16 : sheet.getLastRow();
      const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); 
      const marketData = [];
      
      data.forEach(row => {
        const symbol = String(row[0]).trim();
        if (symbol && symbol !== '' && symbol !== '#N/A' && symbol !== 'undefined') {
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
      const allFunds = ['TLY', 'DFI', 'BOS', 'AFT', 'SSS'];
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
 * Fallback: Eğer sheet'te yoksa Yahoo Finance'ten çekmeyi dener
 */
function getStockData(sheet, symbol) {
  const lastRow = sheet.getLastRow();
  let foundData = null;

  if (lastRow > 1) {
    // B sütunu = Hisse Kodu
    const codes = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    
    // Hisseyi bul
    const rowIndex = codes.findIndex(code => {
      let c = String(code).trim();
      c = c.replace(/ FONU$/i, ''); // Remove " FONU" suffix
      return c.toUpperCase() === symbol.toUpperCase();
    });
    
    if (rowIndex !== -1) {
      const actualRow = rowIndex + 2; // 0-indexed + header row
      const rowData = sheet.getRange(actualRow, 2, 1, 5).getValues()[0];
      
      foundData = {
        code: String(rowData[0]).trim(),
        currentPrice: parseNumber(rowData[4]),  // F sütunu
        prevClose: parseNumber(rowData[3]),     // E sütunu
        quantity: parseNumber(rowData[2]),      // D sütunu
        success: true
      };
    }
  }

  if (foundData) return foundData;

  return {
    code: symbol,
    success: false,
    error: 'Symbol not found in sheet'
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
  
  // Q1 hücresinden güncelleme saatini oku
  const updateTimeValue = sheet.getRange("Q1").getValue();
  let formattedTime = null;
  
  if (updateTimeValue) {
    try {
      // Eğer tarih objesi ise saat:dakika formatına çevir
      if (updateTimeValue instanceof Date) {
        const hours = updateTimeValue.getHours().toString().padStart(2, '0');
        const minutes = updateTimeValue.getMinutes().toString().padStart(2, '0');
        formattedTime = `${hours}:${minutes}`;
      } else {
        // String ise direkt al (veya parse etmeye çalış)
        formattedTime = String(updateTimeValue);
      }
    } catch (e) {
      // Ignore error
    }
  }

  const results = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let code = String(row[0]).trim();
    
    // " FONU" suffix'ini temizle (Örn: "HMV FONU" -> "HMV")
    code = code.replace(/ FONU$/i, '').trim();
    
    // Boş satırları atla
    if (!code || code === '' || code === '#N/A') continue;
    
    results.push({
      code: code,
      currentPrice: parseNumber(row[4]),  // F sütunu
      prevClose: parseNumber(row[3]),     // E sütunu
      quantity: parseNumber(row[2]),      // D sütunu
      updateTime: formattedTime,          // Sheet'ten gelen güncelleme saati
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
  if (value === null || value === undefined || value === '') return 0;
  
  let s = String(value).trim();
  
  // Eğer hem nokta hem virgül varsa (örn: 1.234,56) -> Binlik noktayı kaldır, virgülü noktaya çevir
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } 
  // Sadece virgül varsa (örn: 54,33) -> Virgülü noktaya çevir
  else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  // Sadece nokta varsa ondalık kabul et (örn: 54.33)
  
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/**
 * JSON response oluştur
 */
function createJsonResponse(data, statusCode = 200) {
  const jsonString = JSON.stringify(data);
  const output = ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
  
  // Apps Script Web Apps handle CORS automatically by redirecting, 
  // but adding headers can sometimes help with specific client libraries.
  // Note: Standard 'Access-Control-Allow-Origin' header is not directly settable in TextOutput,
  // Google handles this via the macro redirect mechanism.
  
  return output;
}
