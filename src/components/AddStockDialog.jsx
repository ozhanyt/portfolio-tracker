import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchStockPrice } from '@/services/stockPriceService'
import { saveLogoUrl } from '@/services/logoService'

// Helper to check if a symbol is a fund
function isFund(symbol) {
    return symbol.length === 3 || symbol.toUpperCase().includes('FON')
}

export function AddStockDialog({ isOpen, onClose, onAdd, editingStock }) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [formData, setFormData] = useState({
        code: '',
        quantity: '',
        prevClose: '',
        currentPrice: '',
        isForeign: false,
        logoUrl: ''
    })
    const [isManual, setIsManual] = useState(false)
    const [isFundEntry, setIsFundEntry] = useState(false)

    useEffect(() => {
        if (editingStock) {
            setFormData({
                code: editingStock.code || '',
                quantity: (editingStock.quantity || 0).toString(),
                prevClose: '',
                currentPrice: '',
                isForeign: editingStock.isForeign || false,
                logoUrl: editingStock.logoUrl || ''
            })
            const isFundVal = isFund(editingStock.code || '')
            setIsFundEntry(isFundVal)
            // If editing, preserve existing isManual setting, or default to true for funds if not set
            setIsManual(editingStock.isManual !== undefined ? editingStock.isManual : isFundVal)
        } else {
            setFormData({
                code: '',
                quantity: '',
                prevClose: '',
                currentPrice: '',
                isForeign: false,
                logoUrl: ''
            })
            setIsFundEntry(false)
            setIsManual(false)
        }
        setError(null)
    }, [editingStock, isOpen])

    // Check if code is a fund when typing
    useEffect(() => {
        if (formData.code) {
            const isFundVal = isFund(formData.code)
            setIsFundEntry(isFundVal)
            // Auto-enable manual mode for funds by default when typing new code
            if (!editingStock) {
                setIsManual(isFundVal)
            }
        }
    }, [formData.code])

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            // Save Logo URL globally if provided
            if (formData.logoUrl && formData.code) {
                await saveLogoUrl(formData.code.toUpperCase(), formData.logoUrl)
            }

            if (isManual) {
                // Manual entry
                if (!formData.prevClose || !formData.currentPrice) {
                    throw new Error('Manuel giriş için fiyatları doldurun.')
                }

                onAdd({
                    code: formData.code.toUpperCase(),
                    quantity: Number(formData.quantity),
                    cost: Number(formData.prevClose),
                    prevClose: Number(formData.prevClose),
                    currentPrice: Number(formData.currentPrice),
                    isManual: true,
                    logoUrl: formData.logoUrl
                })

                setFormData({ code: '', quantity: '', prevClose: '', currentPrice: '', logoUrl: '' })
                onClose()
            } else {
                // Auto-fetch for stocks
                const result = await fetchStockPrice(formData.code.toUpperCase(), { isForeign: formData.isForeign })

                if (!result.success) {
                    throw new Error('Hisse verisi alınamadı. Kodu kontrol edin veya Manuel Girişi seçin.')
                }

                onAdd({
                    code: result.code,
                    quantity: Number(formData.quantity),
                            < label
                                htmlFor = "isForeign"
                                className = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                    Yabancı Hisse(USD)
                            </label >
                        </div >

                        <div className="flex items-center space-x-2 py-2">
                            <input
                                type="checkbox"
                                id="isManual"
                                checked={isManual}
                                onChange={(e) => setIsManual(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label
                                htmlFor="isManual"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Manuel Fiyat Girişi (Otomatik Güncelleme Kapalı)
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Adet</label>
                            <input
                                required
                                type="number"
                                min="0"
                                step="0.000001"
                                disabled={isLoading}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="0"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                            />
                        </div>

    {
        isManual && (
            <>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Önceki Kapanış (Önceki Gün)</label>
                    <input
                        required
                        type="number"
                        min="0"
                        step="0.000001"
                        disabled={isLoading}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="0.00"
                        value={formData.prevClose}
                        onChange={e => setFormData({ ...formData, prevClose: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Fiyat (Bugün Açıklanan)</label>
                    <input
                        required
                        type="number"
                        min="0"
                        step="0.000001"
                        disabled={isLoading}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="0.00"
                        value={formData.currentPrice}
                        onChange={e => setFormData({ ...formData, currentPrice: e.target.value })}
                    />
                </div>
            </>
        )
    }

    {
        error && (
            <div className="text-sm text-red-500 font-medium">
                {error}
            </div>
        )
    }

                        <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground space-y-1">
                            {isManual ? (
                                <>
                                    <p className="font-medium text-blue-600">🔵 Manuel Giriş</p>
                                    <p>• Fiyatlar otomatik güncellenmez, sizin girdiğiniz değerler sabit kalır.</p>
                                    <p>• Fonlar veya Yahoo Finans'ta olmayan varlıklar için kullanın.</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium text-green-600">🟢 Otomatik Güncelleme</p>
                                    <p>• Maliyet ve Güncel Fiyat Yahoo Finans'tan otomatik çekilir.</p>
                                    <p>• 15 dakika gecikmeli veri kullanılır.</p>
                                </>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Veriler Alınıyor...
                                </>
                            ) : (
                                editingStock ? 'Güncelle' : 'Portföye Ekle'
                            )}
                        </button>
                    </form >
                </CardContent >
            </Card >
        </div >
    )
}
