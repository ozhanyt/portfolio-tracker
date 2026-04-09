# Hosting Deploy Notlari

Bu proje Vite tabanli bir SPA oldugu icin paylasimli Linux hostingde `dist` klasoru yayinlanir.

## Gerekenler

1. `fontahmin.com.tr` alan adini yeni hostinge bagla.
2. Hosting panelinde belge kok dizinini bulun (`public_html` veya benzeri).
3. Build ciktisindaki tum dosyalari bu dizine yukleyin.
4. `index.html` ile ayni dizinde `.htaccess` oldugunu kontrol edin.

## Neden `.htaccess` var?

React Router kullandigimiz icin `/portfolio/TLY` gibi adresler dogrudan acildiginda sunucu bunlari dosya sanip 404 donebilir. `.htaccess` bu istekleri `index.html`'e yonlendirir.

## Kontrol Listesi

1. Ana sayfa aciliyor mu?
2. Bir fon detay sayfasi dogrudan URL ile aciliyor mu?
3. Admin girisi calisiyor mu?
4. Firebase tarafinda `fontahmin.com.tr` yetkili alan adlari icinde mi?
