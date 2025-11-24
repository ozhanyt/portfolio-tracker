import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatPercent } from "@/lib/utils"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export function PortfolioChart({ data }) {
    // Group small holdings into "Other"
    const chartData = data.reduce((acc, item) => {
        if (item.weight > 2) {
            acc.push({ name: item.code, value: item.currentValue, weight: item.weight });
        } else {
            const other = acc.find(i => i.name === "Diğer");
            if (other) {
                other.value += item.currentValue;
                other.weight += item.weight;
            } else {
                acc.push({ name: "Diğer", value: item.currentValue, weight: item.weight });
            }
        }
        return acc;
    }, []).sort((a, b) => b.value - a.value);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="font-bold">{payload[0].name}</p>
                    <p className="text-sm text-muted-foreground">
                        {formatCurrency(payload[0].value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatPercent(payload[0].payload.weight)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="col-span-3 md:col-span-1">
            <CardHeader>
                <CardTitle>Portföy Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
