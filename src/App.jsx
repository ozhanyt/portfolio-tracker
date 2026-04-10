import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { logEvent } from 'firebase/analytics'
import { Lock, AlertTriangle } from 'lucide-react'
import { OverviewPage } from './pages/OverviewPage'
import { PortfolioDetailPage } from './pages/PortfolioDetailPage'
import { AboutPage } from './pages/AboutPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ContactPage } from './pages/ContactPage'
import { ReportsPage } from './pages/ReportsPage'
import { ReportDetailPage } from './pages/ReportDetailPage'
import { AdminProvider, useAdmin } from './contexts/AdminContext'
import { AdminLoginDialog } from './components/AdminLoginDialog'
import { XIcon } from './components/icons/XIcon'
import { SeoManager } from './components/SeoManager'
import { analytics } from './firebase'

const PRIMARY_HOST = 'fontahmin.com.tr'
const LEGACY_HOSTS = new Set([
  'www.fontahmin.com.tr',
  'portfolio-tracker-lilac-mu.vercel.app',
])

function CanonicalRedirect() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const { hostname, pathname, search, hash, protocol } = window.location
    if (!LEGACY_HOSTS.has(hostname)) return

    const nextUrl = `https://${PRIMARY_HOST}${pathname}${search}${hash}`
    if (`${protocol}//${hostname}${pathname}${search}${hash}` !== nextUrl) {
      window.location.replace(nextUrl)
    }
  }, [location])

  return null
}

function getSeoMeta(pathname) {
  if (pathname.startsWith('/portfolio/')) {
    return {
      title: 'Fon Detayı | fontahmin.com.tr',
      description: 'Seçili fon için günlük getiri, portföy değeri, kar zarar ve içerik görünümünü fontahmin.com.tr üzerinde takip edin.',
      canonicalPath: pathname,
      type: 'article',
    }
  }

  if (pathname === '/hakkinda') {
    return {
      title: 'Hakkında | fontahmin.com.tr',
      description: 'fontahmin.com.tr üzerinde yer alan fon görünümü, veri akışı ve kullanım amacı hakkında kısa bilgiler.',
      canonicalPath: pathname,
    }
  }

  if (pathname === '/gizlilik-politikasi') {
    return {
      title: 'Gizlilik Politikası | fontahmin.com.tr',
      description: 'fontahmin.com.tr üzerinde kullanılan temel analiz ve kullanım verileri hakkında bilgilendirme.',
      canonicalPath: pathname,
    }
  }

  if (pathname === '/iletisim') {
    return {
      title: 'İletişim | fontahmin.com.tr',
      description: 'fontahmin.com.tr için görüş, öneri ve teknik bildirim kanallarına bu sayfadan ulaşabilirsiniz.',
      canonicalPath: pathname,
    }
  }

  if (pathname === '/raporlar/haftalik') {
    return {
      title: 'Haftalık Raporlar | fontahmin.com.tr',
      description: 'Takipteki fonlar için haftalık para girişi çıkışı, fon dağılım raporu ve TEFAS özeti arşivi.',
      canonicalPath: pathname,
      type: 'article',
    }
  }

  if (pathname === '/raporlar/aylik') {
    return {
      title: 'Aylık Raporlar | fontahmin.com.tr',
      description: 'Takipteki fonlar için aylık para akışı, fon dağılım görünümü ve dönemsel TEFAS özetleri.',
      canonicalPath: pathname,
      type: 'article',
    }
  }

  if (/^\/raporlar\/[^/]+\/[^/]+\/[^/]+$/.test(pathname)) {
    return {
      title: 'Rapor Detayı | fontahmin.com.tr',
      description: 'Seçili dönem ve rapor tipi için görsel rapor detaylarını fontahmin.com.tr üzerinde inceleyin.',
      canonicalPath: pathname,
      type: 'article',
    }
  }

  if (pathname.startsWith('/raporlar/')) {
    return {
      title: 'Günlük Raporlar | fontahmin.com.tr',
      description: 'Takipteki fonlar için günlük para girişi çıkışı, fon dağılım raporu ve TEFAS özeti arşivi.',
      canonicalPath: pathname,
      type: 'article',
    }
  }

  return {
    title: 'fontahmin.com.tr | Günlük Fon Görünümü',
    description: 'Takipteki fonlar için günlük görünüm, fon detayları, TEFAS özetleri ve dönemsel raporlar tek yerde.',
    canonicalPath: '/',
    type: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'fontahmin.com.tr',
      url: 'https://fontahmin.com.tr/',
      description: 'Takipteki fonlar için günlük görünüm, fon detayları, TEFAS özetleri ve dönemsel raporlar tek yerde.',
      inLanguage: 'tr-TR',
    },
  }
}

function AnalyticsTracker() {
  const location = useLocation()
  const seoMeta = useMemo(() => getSeoMeta(location.pathname), [location.pathname])

  useEffect(() => {
    if (!analytics || typeof window === 'undefined') return

    logEvent(analytics, 'page_view', {
      page_title: seoMeta.title,
      page_location: window.location.href,
      page_path: `${location.pathname}${location.search}${location.hash}`,
    })
  }, [location, seoMeta])

  return <SeoManager {...seoMeta} />
}

function AppContent() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false)
  const { isAdmin } = useAdmin()

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground antialiased transition-colors duration-300">
      <div className="border-b border-yellow-600/20 bg-yellow-600/20 px-4 py-1 text-center text-xs font-medium text-yellow-600 dark:text-yellow-400">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="h-3 w-3" />
          BIST verileri 15 dakika gecikmelidir.
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="cursor-pointer text-lg font-bold transition-opacity hover:opacity-80">
            <span className="text-primary">fontahmin.com.tr</span>
          </Link>
          <button
            onClick={() => setIsAdminLoginOpen(true)}
            className={`rounded-full p-2 transition-colors ${
              isAdmin ? 'bg-green-500/10 text-green-500' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={isAdmin ? 'Yönetici modu aktif' : 'Yönetici girişi'}
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1">
        <CanonicalRedirect />
        <AnalyticsTracker />
        <Routes>
          <Route path="/" element={<OverviewPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
          <Route path="/portfolio/:fundCode" element={<PortfolioDetailPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
          <Route path="/hakkinda" element={<AboutPage />} />
          <Route path="/gizlilik-politikasi" element={<PrivacyPage />} />
          <Route path="/iletisim" element={<ContactPage />} />
          <Route path="/raporlar/:period" element={<ReportsPage />} />
          <Route path="/raporlar/:period/:reportType/:reportId" element={<ReportDetailPage />} />
        </Routes>
      </main>

      <footer className="bg-muted/20 py-6">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-sm text-muted-foreground">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link to="/hakkinda" className="transition-colors hover:text-foreground">
              Hakkında
            </Link>
            <Link to="/gizlilik-politikasi" className="transition-colors hover:text-foreground">
              Gizlilik Politikası
            </Link>
            <Link to="/iletisim" className="transition-colors hover:text-foreground">
              İletişim
            </Link>
            <Link to="/raporlar/gunluk" className="transition-colors hover:text-foreground">
              Raporlar
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <span>Geliştirici:</span>
            <a
              href="https://x.com/sevketozhan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
            >
              <XIcon className="h-3 w-3" />
              Şevket Özhan
            </a>
          </div>
          <p className="text-xs opacity-70">Bu site sadece bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.</p>
        </div>
      </footer>

      <AdminLoginDialog isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} />
    </div>
  )
}

function App() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AdminProvider>
  )
}

export default App
