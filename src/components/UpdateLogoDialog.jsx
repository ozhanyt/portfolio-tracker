import { useState, useEffect } from 'react'
import { X, Loader2, Save, Image as ImageIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { saveLogoUrl } from '@/services/logoService'
import StockLogo from './StockLogo'

export function UpdateLogoDialog({ isOpen, onClose, stock, onSave }) {
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [previewError, setPreviewError] = useState(false)

    useEffect(() => {
        if (stock) {
            setUrl(stock.logoUrl || '')
            setPreviewError(false)
        } else {
            setUrl('')
        }
    }, [stock, isOpen])

    if (!isOpen || !stock) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await saveLogoUrl(stock.code, url)
            if (onSave) onSave() // Trigger refresh in parent
            onClose()
        } catch (error) {
            console.error('Error saving logo:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                >
                    <X className="h-4 w-4" />
                </button>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Logo Düzenle: {stock.code}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex justify-center py-4">
                            <div className="relative">
                                <StockLogo
                                    symbol={stock.code}
                                    logoUrl={url}
                                    className="w-24 h-24 text-2xl"
                                />
                                <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 border shadow-sm">
                                    {previewError ? (
                                        <span className="text-xs text-red-500 font-bold px-2">Hata</span>
                                    ) : (
                                        <span className="text-xs text-green-500 font-bold px-2">Önizleme</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Logo URL</label>
                            <input
                                type="url"
                                required
                                disabled={isLoading}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="https://ornek.com/logo.png"
                                value={url}
                                onChange={e => {
                                    setUrl(e.target.value)
                                    setPreviewError(false)
                                }}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                * Bu logo tüm fonlarda {stock.code} hissesi için geçerli olacaktır.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Kaydet
                                </>
                            )}
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
