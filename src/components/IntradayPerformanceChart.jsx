import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IntradayPerformanceChart({ data, isLoading }) {
    // If no data yet or loading, we can show a skeleton or empty state
    // For now, let's just render what we have or an empty array
    const chartData = data || [];

    // Determine color based on the last data point
    const lastValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
    const isPositive = lastValue >= 0;
    const color = isPositive ? "#22c55e" : "#ef4444"; // green-500 : red-500

    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                Henüz veri yok
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
                data={chartData}
                margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                }}
            >
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis
                    dataKey="time"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `%${value.toFixed(2)}`}
                    domain={['auto', 'auto']}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => [`%${value.toFixed(2)}`, 'Getiri']}
                    labelStyle={{ color: '#9ca3af' }}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
