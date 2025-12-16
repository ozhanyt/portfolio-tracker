import { useState } from 'react'
import { X, Lock, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdmin } from '@/contexts/AdminContext'

export function AdminLoginDialog({ isOpen, onClose }) {
    const { isAdmin, login, logout } = useAdmin()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const success = await login(email, password)

        if (success) {
            setEmail('')
            setPassword('')
            setError('')
            onClose()
        } else {
            setError('Giriş başarısız. Bilgilerinizi kontrol edin.')
        }
        setLoading(false)
    }

    const handleLogout = () => {
        logout()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm relative bg-background">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        {isAdmin ? 'Yönetici Paneli' : 'Yönetici Girişi'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isAdmin ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Şu anda yönetici olarak giriş yapmış durumdasınız. Düzenleme yapabilirsiniz.
                            </p>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Çıkış Yap
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Şifre"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                />
                                {error && <p className="text-xs text-red-500">{error}</p>}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 p-2 rounded-md transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                            </button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
