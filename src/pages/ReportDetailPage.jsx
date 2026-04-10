import { Link, useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { REPORT_PERIODS, REPORT_TYPES } from '@/data/reportCatalog'
import { useReports } from '@/hooks/useReports'

export function ReportDetailPage() {
  const { period = 'gunluk', reportType = '', reportId = '' } = useParams()
  const { reports, isLoading } = useReports()
  const periodMeta = REPORT_PERIODS[period] || REPORT_PERIODS.gunluk
  const typeMeta = REPORT_TYPES[reportType]
  const report = reports.find((item) => item.id === reportId && item.reportType === reportType)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-sm text-muted-foreground">Rapor yükleniyor...</div>
      </div>
    )
  }

  if (!report || !typeMeta) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <Link to={`/raporlar/${period}`} className="text-sm font-medium text-primary hover:underline">
            {periodMeta.pageTitle} sayfasına dön
          </Link>
          <Card className="border-border/80 bg-card/70">
            <CardContent className="py-6 text-sm leading-7 text-muted-foreground">
              Bu rapor henüz yayınlanmamış ya da yükleme bilgileri eksik görünüyor.
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-3 border-b pb-6">
          <Link to={`/raporlar/${period}`} className="text-sm font-medium text-primary hover:underline">
            {periodMeta.pageTitle} sayfasına dön
          </Link>
          <p className="text-sm font-medium text-primary">{periodMeta.title}</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{report.title || typeMeta.title}</h1>
          <div className="space-y-2 text-sm leading-7 text-muted-foreground sm:text-base">
            <p>{report.dateLabel}</p>
            {(report.summary || typeMeta.description) && <p>{report.summary || typeMeta.description}</p>}
          </div>
        </div>

        <div className="space-y-4">
          {(report.images || []).map((image, index) => (
            <Card key={`${report.id}-${index}`} className="overflow-hidden border-border/80 bg-card/70">
              <CardContent className="bg-muted/10 p-3 sm:p-4">
                <img
                  src={image.src}
                  alt={image.alt || `${report.title || typeMeta.title} görsel ${index + 1}`}
                  className="mx-auto block h-auto max-h-[70vh] max-w-full rounded-md object-contain sm:max-h-[80vh]"
                  loading="lazy"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
