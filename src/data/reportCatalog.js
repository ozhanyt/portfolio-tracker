export const REPORT_PERIODS = {
  gunluk: {
    title: 'Günlük',
    pageTitle: 'Günlük Raporlar',
    description: 'Takipteki fonlar için günlük para hareketleri, dağılım görünümü ve TEFAS özetleri burada yer alacak.',
  },
  haftalik: {
    title: 'Haftalık',
    pageTitle: 'Haftalık Raporlar',
    description: 'Hafta genelindeki yönü, öne çıkan değişimleri ve haftalık TEFAS görünümünü bu alanda takip edebilirsiniz.',
  },
  aylik: {
    title: 'Aylık',
    pageTitle: 'Aylık Raporlar',
    description: 'Aylık perspektifte para akışı, fon dağılımı ve dönemsel TEFAS özeti tek yerde toplanacak.',
  },
}

export const REPORT_TYPES = {
  'para-girisi-cikisi': {
    title: 'Takipteki Fonların Para Girişi Çıkışı',
    description: 'Takipteki fonlar için giriş ve çıkış yönünü dönem bazında özetler.',
  },
  'fon-dagilim-raporu': {
    title: 'Fon Dağılım Raporu',
    description: 'Fonların içerik dağılımına ve öne çıkan ağırlıklara daha hızlı bakmanızı sağlar.',
  },
  'tefas-ozeti': {
    title: 'TEFAS Özeti',
    description: 'İlgili dönem için genel görünümü kısa, net ve görsel ağırlıklı biçimde sunar.',
  },
}

export const REPORT_TYPE_ORDER = ['para-girisi-cikisi', 'fon-dagilim-raporu', 'tefas-ozeti']
