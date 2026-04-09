export function AboutPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Hakkında</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            fontahmin.com.tr, fonlara ait günlük görünümü tek ekranda takip etmeyi kolaylaştırmak için hazırlanmıştır.
          </p>
        </header>

        <section className="space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
          <p>
            Sitede yer alan veriler, farklı kaynaklardan derlenerek özet görünüm halinde sunulur. Amaç; fonların günlük performansını,
            portföy değerini ve öne çıkan değişimleri daha kolay takip etmektir.
          </p>
          <p>
            Bu içerik yalnızca bilgilendirme amaçlıdır. Sitede yer alan veriler, yorumlar ve görünümler yatırım tavsiyesi niteliği taşımaz.
          </p>
          <p>
            Veriler belirli aralıklarla güncellenir. Piyasa verileri ve fon içerikleri kaynak sistemlerdeki gecikmelere bağlı olarak anlık
            değişim gösterebilir.
          </p>
        </section>
      </div>
    </div>
  )
}
