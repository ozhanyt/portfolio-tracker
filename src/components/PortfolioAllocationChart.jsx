import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber } from '@/lib/utils'

// Nice modern color palette for charts
const COLORS = [
    '#0ea5e9', // Sky 500
    '#22c55e', // Green 500
    '#eab308', // Yellow 500
    '#f97316', // Orange 500
    '#ef4444', // Red 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
    '#6366f1', // Indigo 500
    '#14b8a6', // Teal 500
    '#64748b', // Slate 500
]

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        return (
            <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                <p className="font-bold mb-1">{data.name}</p>
                <div className="text-sm space-y-1">
                    <p className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Değer:</span>
                        <span className="font-mono">{formatCurrency(data.value, 0)}</span>
                    </p>
                    <p className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Oran:</span>
                        <span className="font-mono">%{data.percent.toFixed(2)}</span>
                    </p>
                </div>
            </div>
        )
    }
    return null
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if segment is large enough
    if (percent < 0.05) return null;

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export function PortfolioAllocationChart({ data }) {
    // Prepare data: Top 6 items + "Other"
    const chartData = []
    let otherValue = 0

    // Filter positive items and sort by value desc
    const validData = data
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)

    const total = validData.reduce((sum, item) => sum + item.value, 0)

    validData.forEach((item, index) => {
        if (index < 6) {
            chartData.push({
                name: item.code,
                value: item.value,
                percent: (item.value / total) * 100
            })
        } else {
            otherValue += item.value
        }
    })

    if (otherValue > 0) {
        chartData.push({
            name: 'Diğer',
            value: otherValue,
            percent: (otherValue / total) * 100
        })
    }

    return (
        <Card className="col-span-1 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    Portföy Dağılımı
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="h-[350px] w-full max-w-[500px]">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={120}
                                    innerRadius={60} // Donut style
                                    fill="#8884d8"
                                    dataKey="value"
                                    paddingAngle={2}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            Veri yok
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
