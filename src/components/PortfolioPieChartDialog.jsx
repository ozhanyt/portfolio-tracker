import { useMemo, useRef, useState } from 'react'
import { X, PieChart as PieChartIcon, Copy, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import html2canvas from 'html2canvas'
import { XIcon } from './icons/XIcon'

const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
    '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658', '#ff7300'
]

export function PortfolioPieChartDialog({ isOpen, onClose, data, fundCode }) {
    const chartRef = useRef(null)
    const [isCopying, setIsCopying] = useState(false)

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        const threshold = 3 // 3%
        let mainItems = []
        let otherWeight = 0
        let otherCount = 0

        data.forEach(item => {
            const val = Number(item.weight)
            if (isNaN(val) || val <= 0) return

            if (val >= threshold) {
                mainItems.push({
                    name: item.code,
                    value: val,
                    original: item
                })
            } else {
                otherWeight += val
                otherCount++
            }
        })

        // Sort main items by value descending
        mainItems.sort((a, b) => b.value - a.value)

        // Add "Diğer" at the end if it exists
        if (otherWeight > 0) {
            mainItems.push({
                name: 'Diğer',
                value: otherWeight,
                isOther: true,
                count: otherCount
            })
        }

        return mainItems
    }, [data])

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
        const RADIAN = Math.PI / 180
        const radius = outerRadius * 1.15
        const x = cx + radius * Math.cos(-midAngle * RADIAN)
        const y = cy + radius * Math.sin(-midAngle * RADIAN)

        return (
            <text
                x={x}
                y={y}
                fill="hsl(var(--foreground))"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-[10px] sm:text-xs font-medium"
            >
                {`${name}: %${value.toFixed(2)}`}
            </text>
        )
    }

    const handleCopyImage = async () => {
        if (!chartRef.current) return
        setIsCopying(true)
        try {
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#09090b', // dark background
                scale: 2 // higher resolution
            })

            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ])
                    alert('Grafik kopyalandı! İstediğiniz yere yapıştırabilirsiniz.')
                } catch (err) {
                    console.error('Clipboard write failed:', err)
                    // Fallback to download
                    const link = document.createElement('a')
                    link.download = `${fundCode}-dagilim.png`
                    link.href = canvas.toDataURL()
                    link.click()
                }
            })
        } catch (error) {
            console.error('Image generation failed:', error)
        } finally {
            setIsCopying(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <Card className="w-full max-w-3xl relative bg-background border-border">
                <div className="absolute right-2 top-2 sm:right-4 sm:top-4 flex items-center gap-2 z-[100]">
                    <button
                        onClick={handleCopyImage}
                        disabled={isCopying}
                        className="p-3 sm:p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 bg-background/80 sm:bg-transparent rounded-full transition-colors shadow-lg sm:shadow-none"
                        title="Resim Olarak Kopyala"
                    >
                        {isCopying ? <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" /> : <Copy className="h-5 w-5 sm:h-4 sm:w-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-3 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted bg-background/80 sm:bg-transparent rounded-full transition-colors shadow-lg sm:shadow-none"
                    >
                        <X className="h-5 w-5 sm:h-4 sm:w-4" />
                    </button>
                </div>

                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-primary" />
                        Portföy Dağılımı
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div ref={chartRef} className="h-[350px] sm:h-[450px] md:h-[500px] w-full relative bg-background p-2 sm:p-4 rounded-lg">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="35%"
                                        outerRadius="55%"
                                        paddingAngle={2}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        isAnimationActive={false}
                                        label={renderCustomizedLabel}
                                        labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.name === 'Diğer' ? '#94a3b8' : COLORS[index % COLORS.length]}
                                                stroke="none"
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Görüntülenecek veri yok
                            </div>
                        )}

                        {/* Center Label */}
                        {chartData.length > 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0">
                                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                                    {fundCode?.substring(0, 3)}
                                </span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                                    Dağılım
                                </span>

                                {/* Twitter Link */}
                                <div className="flex flex-col items-center pointer-events-auto">
                                    <a
                                        href="https://x.com/sevketozhan"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors group"
                                    >
                                        <XIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
                                        <span className="text-[10px] sm:text-xs font-medium">@sevketozhan</span>
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
