export function ContactPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">İletişim</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Görüş, öneri ve teknik bildirimler için aşağıdaki kanalları kullanabilirsiniz.
          </p>
        </header>

        <section className="space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
          <p>
            X üzerinden iletişim:{" "}
            <a
              href="https://x.com/sevketozhan"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              x.com/sevketozhan
            </a>
          </p>
          <p>
            Siteyle ilgili teknik bir sorun fark ederseniz, mümkünse ekran görüntüsü ve kısa açıklama ile iletmeniz süreci hızlandırır.
          </p>
          <p>
            Veri kaynakları, güncelleme akışı veya görünüm önerileri için de aynı kanal üzerinden ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </div>
  )
}
