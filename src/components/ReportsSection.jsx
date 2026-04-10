import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { REPORT_PERIODS } from '@/data/reportCatalog'

export function ReportsSection() {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Raporlar</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Günlük, haftalık ve aylık rapor arşivlerine bu alandan hızlıca ulaşabilirsiniz.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(REPORT_PERIODS).map(([slug, period]) => (
          <Link key={slug} to={`/raporlar/${slug}`} className="block">
            <Card className="h-full border-border/80 bg-card/70 transition-colors hover:bg-accent/30">
              <CardHeader className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Rapor Dönemi</p>
                <CardTitle className="text-xl">{period.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-muted-foreground">{period.description}</p>
                <p className="text-sm font-medium text-primary">Raporları görüntüle</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
