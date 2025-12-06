import { ResponsiveContainer, Treemap, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'

const CustomContent = ({ depth, x, y, width, height, index, payload, colors, rank, name }) => {
    // Only render leaf nodes (depth 1 in our case, assuming root is depth 0)
    if (depth !== 1) return null

    const fillColor = payload?.color || '#3b82f6'

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: fillColor,
                    stroke: '#fff',
                    strokeWidth: 2,
                    strokeOpacity: 1,
                }}
            />
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={14}
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                >
                    {name}
                </text>
            )}
            {width > 50 && height > 50 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 20}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    style={{ pointerEvents: 'none' }}
                >
                    {payload.returnRate >= 0 ? '+' : ''}{payload.returnRate?.toFixed(2)}%
                </text>
            )}
        </g>
    )
}

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        // Skip tooltip for root node or invalid data
        if (!data || data.name === 'Portfolio') return null

        return (
            <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                <p className="font-bold mb-1">{data.name}</p>
                <div className="text-sm space-y-1">
                    <p className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Değer:</span>
                        <span className="font-mono">{formatCurrency(data.size, 0)}</span>
                    </p>
                    <p className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Getiri:</span>
                        <span className={cn(
                            "font-mono font-bold",
                            data.returnRate >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                            {data.returnRate >= 0 ? '+' : ''}{data.returnRate?.toFixed(2)}%
                        </span>
                    </p>
                    <p className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Ağırlık:</span>
                        <span className="font-mono">%{data.weight?.toFixed(2)}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function PortfolioTreemap({ data }) {
    // Transform data for Treemap (Recharts expects children array)
    const chartData = data
        .filter(item => item.value > 0)
        .map(item => {
            let color = '#9ca3af'; // Default gray
            if (item.returnRate > 0) color = '#10b981'; // Green-500
            else if (item.returnRate < 0) color = '#ef4444'; // Red-500

            return {
                name: item.code,
                size: item.value,
                returnRate: item.returnRate,
                weight: item.weight,
                color: color
            }
        });

    // Root node
    const rootData = [{
        name: 'Portfolio',
        children: chartData
    }]

    return (
        <Card className="col-span-1 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    Portföy Haritası
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                <div className="h-[500px] w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                                data={rootData}
                                dataKey="size"
                                aspectRatio={4 / 3}
                                stroke="#fff"
                                content={<CustomContent />}
                                isAnimationActive={false}
                                type="nest"
                            >
                                <Tooltip content={<CustomTooltip />} />
                            </Treemap>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            Görüntülenecek veri yok
                        </div>
                    )}
                </div>
            </CardContent>
        </Card >
    )
}
