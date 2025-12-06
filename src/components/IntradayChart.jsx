import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { cn } from '@/lib/utils'

function getTodayDate() {
    const now = new Date()
    return now.toISOString().split('T')[0]
}

function CustomTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        const returnValue = data.return || 0
        const isPositive = returnValue >= 0

        return (
            <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                <p className="text-sm font-medium mb-1">{data.time}</p>
                <p className={cn(
                    "text-lg font-bold",
                    isPositive ? "text-green-600" : "text-red-600"
                )}>
                    {isPositive ? '+' : ''}{returnValue.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Değer: {data.totalValue?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </p>
            </div>
        )
    }
    return null
}

export function IntradayChart({ fundCode }) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!fundCode) return

        const date = getTodayDate()
        const docRef = doc(db, 'funds', fundCode, 'intraday', date)

        // Real-time Firestore listener
        const unsubscribe = onSnapshot(
            docRef,
            (doc) => {
                if (doc.exists()) {
                    const snapshots = doc.data().snapshots || []
                    setData(snapshots)
                    setError(null)
                } else {
                    setData([])
                }
                setLoading(false)
            },
            (err) => {
                console.error('Firestore listener error:', err)
                setError(err.message)
                setLoading(false)
            }
        )

        return () => unsubscribe()
    }, [fundCode])

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Gün İçi Getiri Grafiği</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Yükleniyor...
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Gün İçi Getiri Grafiği</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center text-red-500">
                        Hata: {error}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Gün İçi Getiri Grafiği</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Henüz veri yok.
                    </div>
                </CardContent>
            </Card>
        )
    }

    const latestReturn = data[data.length - 1]?.return || 0
    const isPositive = latestReturn >= 0

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Gün İçi Getiri Grafiği</CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Anlık:</span>
                        <span className={cn(
                            "text-lg font-bold",
                            isPositive ? "text-green-600" : "text-red-600"
                        )}>
                            {isPositive ? '+' : ''}{latestReturn.toFixed(2)}%
                        </span>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    {data.length} snapshot • Son güncelleme: {data[data.length - 1]?.time}
                </p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                        <XAxis
                            dataKey="time"
                            stroke="#888"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#888"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => `${value.toFixed(1)}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                        <Line
                            type="monotone"
                            dataKey="return"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
