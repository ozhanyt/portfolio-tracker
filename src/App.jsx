import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { logEvent } from 'firebase/analytics'
import { Lock, AlertTriangle } from 'lucide-react'
import { OverviewPage } from './pages/OverviewPage'
import { PortfolioDetailPage } from './pages/PortfolioDetailPage'
import { AboutPage } from './pages/AboutPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ContactPage } from './pages/ContactPage'
import { ReportsPage } from './pages/ReportsPage'
import { AdminProvider, useAdmin } from './contexts/AdminContext'
import { AdminLoginDialog } from './components/AdminLoginDialog'
import { XIcon } from './components/icons/XIcon'
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

function getPageTitle(pathname) {
  if (pathname.startsWith('/portfolio/')) return 'Fon Detayı | fontahmin.com.tr'
  if (pathname === '/hakkinda') return 'Hakkında | fontahmin.com.tr'
  if (pathname === '/gizlilik-politikasi') return 'Gizlilik Politikası | fontahmin.com.tr'
  if (pathname === '/iletisim') return 'İletişim | fontahmin.com.tr'
  if (pathname === '/raporlar/haftalik') return 'Haftalık Raporlar | fontahmin.com.tr'
  if (pathname === '/raporlar/aylik') return 'Aylık Raporlar | fontahmin.com.tr'
  if (pathname.startsWith('/raporlar/')) return 'Günlük Raporlar | fontahmin.com.tr'
  return 'fontahmin.com.tr | Günlük fon görünümü'
}

function AnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    const pageTitle = getPageTitle(location.pathname)
    document.title = pageTitle

    if (!analytics || typeof window === 'undefined') return

    logEvent(analytics, 'page_view', {
      page_title: pageTitle,
      page_location: window.location.href,
      page_path: `${location.pathname}${location.search}${location.hash}`,
    })
  }, [location])

  return null
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
