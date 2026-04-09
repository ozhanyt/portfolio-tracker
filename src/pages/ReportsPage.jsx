import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { REPORT_PERIODS, REPORT_TYPES, REPORT_TYPE_ORDER } from '@/data/reportCatalog'
import { useReportsManifest } from '@/hooks/useReportsManifest'

export function ReportsPage() {
  const { period = 'gunluk' } = useParams()
  const currentPeriod = REPORT_PERIODS[period] || REPORT_PERIODS.gunluk
  const { manifest, isLoading, error } = useReportsManifest()
  const reportItems = manifest[period] || []

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3 border-b pb-6">
          <p className="text-sm font-medium text-primary">Raporlar</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{currentPeriod.pageTitle}</h1>
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
          {REPORT_TYPE_ORDER.map((reportType) => {
            const reportMeta = REPORT_TYPES[reportType]
            const items = reportItems.filter((item) => item.reportType === reportType)

            return (
              <Card key={reportType} className="border-border/80 bg-card/70">
                <CardHeader className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{currentPeriod.title}</p>
                  <CardTitle className="text-xl leading-8">{reportMeta.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-7 text-muted-foreground">{reportMeta.description}</p>

                  {isLoading ? (
                    <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Raporlar yükleniyor...
                    </div>
                  ) : error ? (
                    <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Rapor listesi şu an yüklenemedi.
                    </div>
                  ) : items.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Bu başlık altında henüz içerik eklenmedi.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          to={`/raporlar/${period}/${reportType}/${item.id}`}
                          className="block rounded-md border border-border/70 bg-muted/20 px-4 py-3 transition-colors hover:bg-accent/40"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">{item.title || reportMeta.title}</p>
                            <p className="text-xs text-muted-foreground">{item.dateLabel}</p>
                            {item.summary && <p className="text-sm text-muted-foreground">{item.summary}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
