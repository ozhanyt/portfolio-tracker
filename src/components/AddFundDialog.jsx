import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addFund } from '@/services/firestoreService'

export function AddFundDialog({ isOpen, onClose }) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        name: ''
    })
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            await addFund(formData.code.toUpperCase(), formData.name)
            setFormData({ code: '', name: '' })
            onClose()
        } catch (err) {
            setError('Fon eklenirken bir hata oluştu.')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md relative bg-background">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                >
                    <X className="h-4 w-4" />
                </button>
                <CardHeader>
                    <CardTitle>Yeni Fon Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fon Kodu</label>
                            <input
                                required
                                type="text"
                                placeholder="Örn: TLY"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fon Adı</label>
                            <input
                                required
                                type="text"
                                placeholder="Örn: TERA PORTFÖY HİSSE SENEDİ FONU"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        {error && <p className="text-xs text-red-500">{error}</p>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 p-2 rounded-md transition-colors flex items-center justify-center"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ekle'}
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
