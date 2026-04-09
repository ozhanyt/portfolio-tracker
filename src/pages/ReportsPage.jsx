import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const REPORT_PERIODS = {
  gunluk: {
    title: 'Günlük Raporlar',
    description: 'Takipteki fonlar için günlük para hareketleri, dağılım görünümü ve TEFAS özetleri burada yer alacak.',
  },
  haftalik: {
    title: 'Haftalık Raporlar',
    description: 'Hafta genelindeki yönü, öne çıkan değişimleri ve haftalık TEFAS görünümünü bu alanda takip edebilirsiniz.',
  },
  aylik: {
    title: 'Aylık Raporlar',
    description: 'Aylık perspektifte para akışı, fon dağılımı ve dönemsel TEFAS özeti tek yerde toplanacak.',
  },
}

const REPORT_TYPES = [
  {
    title: 'Takipteki Fonların Para Girişi Çıkışı',
    description: 'Takipteki fonlar için giriş ve çıkış yönünü dönem bazında özetler.',
  },
  {
    title: 'Fon Dağılım Raporu',
    description: 'Fonların içerik dağılımına ve öne çıkan ağırlıklara daha hızlı bakmanızı sağlar.',
  },
  {
    title: 'TEFAS Özeti',
    description: 'İlgili dönem için genel görünümü kısa, net ve görsel ağırlıklı biçimde sunar.',
  },
]

export function ReportsPage() {
  const { period = 'gunluk' } = useParams()
  const currentPeriod = REPORT_PERIODS[period] || REPORT_PERIODS.gunluk

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3 border-b pb-6">
          <p className="text-sm font-medium text-primary">Raporlar</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{currentPeriod.title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            {currentPeriod.description}
          </p>
        </header>

        <nav className="flex flex-wrap gap-3">
          {Object.entries(REPORT_PERIODS).map(([slug, meta]) => (
            <Link
              key={slug}
              to={`/raporlar/${slug}`}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                slug === period
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {meta.title.replace(' Raporlar', '')}
            </Link>
          ))}
        </nav>

        <div className="grid gap-4 lg:grid-cols-3">
          {REPORT_TYPES.map((report) => (
            <Card key={report.title} className="border-border/80 bg-card/70">
              <CardHeader className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {currentPeriod.title.replace(' Raporlar', '')}
                </p>
                <CardTitle className="text-xl leading-8">{report.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-muted-foreground">{report.description}</p>
                <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Bu alan görsel rapor arşivi için hazır. İlk yüklenen içerikler burada listelenecek.
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
