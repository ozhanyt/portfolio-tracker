export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Gizlilik Politikası</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Bu sayfa, fontahmin.com.tr üzerinde toplanan temel kullanım verileri hakkında bilgilendirme içerir.
          </p>
        </header>

        <section className="space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
          <p>
            Siteyi ziyaret ettiğinizde temel trafik ve kullanım ölçümleri analiz araçları üzerinden toplanabilir. Bu veriler; performansı
            izlemek, kullanım akışını anlamak ve siteyi geliştirmek amacıyla kullanılır.
          </p>
          <p>
            Site üzerinde finansal işlemler gerçekleştirilmez. Ziyaretçilerden doğrudan ödeme bilgisi alınmaz.
          </p>
          <p>
            Üçüncü taraf servisler, kendi çalışma mantıkları kapsamında çerez veya benzeri teknolojiler kullanabilir. Tarayıcı ayarlarınız
            üzerinden bu teknolojileri yönetebilirsiniz.
          </p>
          <p>
            Gizlilikle ilgili talepleriniz için iletişim sayfasındaki kanallardan ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </div>
  )
}
