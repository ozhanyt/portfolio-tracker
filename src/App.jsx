import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { logEvent } from 'firebase/analytics'
import { Lock, AlertTriangle } from 'lucide-react'
import { OverviewPage } from './pages/OverviewPage'
import { PortfolioDetailPage } from './pages/PortfolioDetailPage'
import { AdminProvider, useAdmin } from './contexts/AdminContext'
import { AdminLoginDialog } from './components/AdminLoginDialog'
import { XIcon } from './components/icons/XIcon'
import { analytics } from './firebase'

const PRIMARY_HOST = 'fontahmin.com.tr'
const LEGACY_HOSTS = new Set([
    'www.fontahmin.com.tr',
    'portfolio-tracker-lilac-mu.vercel.app'
])

function CanonicalRedirect() {
    const location = useLocation()

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const { hostname, pathname, search, hash, protocol } = window.location
        if (!LEGACY_HOSTS.has(hostname)) {
            return
        }

        const nextUrl = `https://${PRIMARY_HOST}${pathname}${search}${hash}`
        if (`${protocol}//${hostname}${pathname}${search}${hash}` !== nextUrl) {
            window.location.replace(nextUrl)
        }
    }, [location])

    return null
}

function AnalyticsTracker() {
    const location = useLocation()

    useEffect(() => {
        const pageTitle = location.pathname.startsWith('/portfolio/')
            ? 'Fon Detayi | fontahmin.com.tr'
            : 'fontahmin.com.tr | Gunluk fon gorunumu'

        document.title = pageTitle

        if (!analytics || typeof window === 'undefined') {
            return
        }

        logEvent(analytics, 'page_view', {
            page_title: pageTitle,
            page_location: window.location.href,
            page_path: `${location.pathname}${location.search}${location.hash}`
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
        <div className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased transition-colors duration-300">
            <div className="bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 px-4 py-1 text-xs text-center font-medium flex items-center justify-center gap-2 border-b border-yellow-600/20">
                <AlertTriangle className="h-3 w-3" />
                BIST verileri 15 dakika gecikmelidir.
            </div>

            <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity cursor-pointer">
                        <span className="text-primary">fontahmin.com.tr</span>
                    </Link>
                    <button
                        onClick={() => setIsAdminLoginOpen(true)}
                        className={`p-2 rounded-full transition-colors ${isAdmin ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        title={isAdmin ? 'Yonetici modu aktif' : 'Yonetici girisi'}
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
                </Routes>
            </main>

            <footer className="border-t py-6 bg-muted/20">
                <div className="container mx-auto px-4 flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span>Gelistirici:</span>
                        <a
                            href="https://x.com/sevketozhan"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium"
                        >
                            <XIcon className="h-3 w-3" />
                            Sevket Ozhan
                        </a>
                    </div>
                    <p className="text-xs opacity-70">
                        Bu site sadece bilgilendirme amaclidir. Yatirim tavsiyesi degildir.
                    </p>
                </div>
            </footer>

            <AdminLoginDialog
                isOpen={isAdminLoginOpen}
                onClose={() => setIsAdminLoginOpen(false)}
            />
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
