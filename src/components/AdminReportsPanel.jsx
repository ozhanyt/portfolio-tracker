import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { REPORT_PERIODS, REPORT_TYPES, REPORT_TYPE_ORDER } from '@/data/reportCatalog'
import { addReport, deleteReport } from '@/services/reportService'

function formatFileNames(files) {
  return Array.from(files || []).map((file) => file.name)
}

export function AdminReportsPanel({ initialPeriod = 'gunluk', reports = [] }) {
  const [period, setPeriod] = useState(initialPeriod)
  const [reportType, setReportType] = useState(REPORT_TYPE_ORDER[0])
  const [dateKey, setDateKey] = useState(new Date().toISOString().slice(0, 10))
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [files, setFiles] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const latestReports = useMemo(
    () => reports.filter((item) => item.period === period).slice(0, 5),
    [reports, period]
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!files.length) {
      setError('En az bir görsel seçmeniz gerekiyor.')
      return
    }

    try {
      setIsSaving(true)
      await addReport({
        period,
        reportType,
        title,
        summary,
        dateKey,
        files,
      })

      setTitle('')
      setSummary('')
      setFiles([])
    } catch (uploadError) {
      setError('Rapor yüklenirken bir sorun oluştu. Firebase Storage ve kurallarını kontrol edelim.')
      console.error(uploadError)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (reportId) => {
    const shouldDelete = window.confirm('Bu raporu kaldırmak istediğinize emin misiniz?')
    if (!shouldDelete) return

    try {
      await deleteReport(reportId)
    } catch (deleteError) {
      console.error(deleteError)
      setError('Rapor silinirken bir sorun oluştu.')
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
      <Card className="border-primary/20 bg-card/70">
        <CardHeader className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Yönetici</p>
          <CardTitle className="text-xl sm:text-2xl">Rapor Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Periyot</span>
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(REPORT_PERIODS).map(([slug, meta]) => (
                    <option key={slug} value={slug}>
                      {meta.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Rapor Tipi</span>
                <select
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {REPORT_TYPE_ORDER.map((type) => (
                    <option key={type} value={type}>
                      {REPORT_TYPES[type].title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Tarih</span>
                <input
                  type="date"
                  value={dateKey}
                  onChange={(event) => setDateKey(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </label>
            </div>

            <label className="space-y-2 text-sm block">
              <span className="font-medium text-foreground">Başlık</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={REPORT_TYPES[reportType].title}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2 text-sm block">
              <span className="font-medium text-foreground">Kısa Açıklama</span>
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Raporla ilgili kısa özet..."
              />
            </label>

            <label className="space-y-2 text-sm block">
              <span className="font-medium text-foreground">Görseller</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
                className="block w-full text-sm text-muted-foreground"
              />
              {!!files.length && (
                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                  {formatFileNames(files).join(', ')}
                </div>
              )}
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Yükleniyor...' : 'Raporu Kaydet'}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/70">
        <CardHeader className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Son Eklenenler</p>
          <CardTitle className="text-xl">Bu Periyottaki Raporlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestReports.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Bu periyot için henüz rapor eklenmedi.
            </div>
          ) : (
            latestReports.map((report) => (
              <div key={report.id} className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{report.title || REPORT_TYPES[report.reportType]?.title}</p>
                  <p className="text-xs text-muted-foreground">{report.dateLabel}</p>
                  <p className="text-xs text-muted-foreground">{(report.images || []).length} görsel</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(report.id)}
                  className="mt-3 text-xs font-medium text-red-500 transition-colors hover:text-red-400"
                >
                  Raporu Sil
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
