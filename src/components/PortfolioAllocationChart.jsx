import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

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

const renderCustomLabel = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Custom logic for outside labels
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={props.fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={props.fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={4} textAnchor={textAnchor} fill="#999" fontSize={12} fontWeight="bold">
                {name}: %{(percent * 100).toFixed(2)}
            </text>
        </g>
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
                <div className="h-[400px] w-full max-w-[800px]">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false} // We draw our own in renderCustomLabel
                                    label={renderCustomLabel}
                                    outerRadius={120}
                                    innerRadius={70} // Thinner donut
                                    fill="#8884d8"
                                    dataKey="value"
                                    paddingAngle={2}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                {/* Legend removed as requested */}
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
