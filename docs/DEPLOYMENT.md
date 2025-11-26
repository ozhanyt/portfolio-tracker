# Google Apps Script API Deployment Guide

## 1. Apps Script'i Deploy Et

### Adım 1: Kodu Ekle
1. Google Sheet'ini aç: `https://docs.google.com/spreadsheets/d/12ktISobrUZw60q7hsavk77yMtLL7CJ8m8j7-nJFNHc4/edit`
2. **Uzantılar > Apps Script** menüsüne tıkla
3. Yeni bir dosya oluştur: **sheet-json-api.gs**
4. `docs/sheet-json-api.gs` dosyasındaki kodu kopyala-yapıştır

### Adım 2: Deploy (Yayınla)
1. Sağ üstten **Deploy > New Deployment** tıkla
2. Ayarlar:
   - **Type**: Web app (⚙️ İkonuna tıkla ve seç)
   - **Description**: "Portfolio API v1"
   - **Execute as**: **Me** (senin hesabınla çalışsın)
   - **Who has access**: **Anyone** (herkes erişebilsin)
3. **Deploy** butonuna bas
4. İzin isterse **Authorize** de ve Google hesabınla onayla
5. Çıkan **Web app URL**'ini KOPYALA (örnek: `https://script.google.com/macros/s/AKfy...xyz/exec`)

## 2. API URL'ini Test Et

Tarayıcına aşağıdaki URL'yi yapıştır (senin URL'inle değiştir):
```
https://script.google.com/macros/s/SENIN_URL/exec?fund=AFT
```

Eğer JSON formatında hisse verileri görüyorsan ✅ başarılı demektir!

## 3. React Projesinde Kullan

### Ortam Değişkeni Ekle
`portfolio-tracker` klasöründe `.env` dosyası oluştur (veya varsa düzenle):

```env
VITE_SHEET_API_URL=https://script.google.com/macros/s/SENIN_URL/exec
```

### stockPriceService.js'yi Güncelle
Artık Yahoo Finance yerine bu API kullanılacak.

## 4. Deployment'ı Güncelleme (İleride)

Eğer `sheet-json-api.gs` kodunda değişiklik yaparsan:
1. **Deploy > Manage Deployments**
2. Mevcut deployment'ın yanındaki **Edit (pencil) ✏️** ikonuna tıkla
3. **Version**: "New Version" seç
4. **Deploy** bas

URL aynı kalır, kod güncellenir.

## API Kullanımı

- Tüm hisseler: `?fund=AFT`
- Tek hisse: `?symbol=TERA`
- Birden fazla: `?symbols=TERA,THYAO,SISE`
