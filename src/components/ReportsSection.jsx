import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const REPORT_PERIODS = [
  {
    slug: 'gunluk',
    title: 'Günlük',
    description: 'Günlük para girişi çıkışı, fon dağılım raporu ve TEFAS özeti.',
  },
  {
    slug: 'haftalik',
    title: 'Haftalık',
    description: 'Hafta genelindeki para yönünü, dağılım değişimini ve özet raporları takip edin.',
  },
  {
    slug: 'aylik',
    title: 'Aylık',
    description: 'Aylık perspektifte takipteki fonların dönemsel görünümünü tek yerde toplayın.',
  },
]

const REPORT_TYPES = [
  'Takipteki Fonların Para Girişi Çıkışı',
  'Fon Dağılım Raporu',
  'TEFAS Özeti',
]

export function ReportsSection() {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Raporlar</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Günlük, haftalık ve aylık rapor akışı için ayrı alanlar hazır. Her dönemde aynı üç başlık altında düzenli
          rapor görselleri yayınlanacak.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {REPORT_PERIODS.map((period) => (
          <Link key={period.slug} to={`/raporlar/${period.slug}`} className="block">
            <Card className="h-full border-border/80 bg-card/70 transition-colors hover:bg-accent/30">
              <CardHeader className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Rapor Dönemi</p>
                <CardTitle className="text-xl">{period.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-muted-foreground">{period.description}</p>
                <ul className="space-y-2 text-sm text-foreground">
                  {REPORT_TYPES.map((reportType) => (
                    <li key={reportType} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                      {reportType}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
