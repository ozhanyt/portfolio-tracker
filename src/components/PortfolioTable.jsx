import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber, formatFundPrice, formatPercent, cn } from "@/lib/utils"
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, Trash2, Pencil, PieChart } from "lucide-react"
import { PortfolioPieChartDialog } from './PortfolioPieChartDialog'
import StockLogo from './StockLogo'

// Helper to check if a symbol is a fund
function isFund(code) {
    return code.length === 3 || code.toUpperCase().includes('FON')
}

export function PortfolioTable({ data, onDelete, onEdit, fundCode }) {
    const [isPieChartOpen, setIsPieChartOpen] = useState(false)

    return (
        <>
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Portföy Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm text-center">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="p-4 text-left">Hisse</th>
                                    <th
                                        className="p-4 text-center cursor-pointer hover:text-primary hover:bg-muted transition-colors group relative"
                                        onClick={() => setIsPieChartOpen(true)}
                                        title="Dağılım Grafiğini Gör"
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            Ağırlık
                                            <PieChart className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-center">Fark %</th>
                                    <th className="p-4 text-center">Adet</th>
                                    <th className="p-4 text-center">Önceki Kapanış</th>
                                    <th className="p-4 text-center">Fiyat</th>
                                    <th className="p-4 text-center">Portföy Değeri</th>
                                    <th className="p-4 text-center">Kar/Zarar (TL)</th>
                                    {(onEdit || onDelete) && <th className="p-4 text-center w-[100px]"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.map((item) => {
                                    const isItemFund = isFund(item.code)
                                    return (
                                        <tr key={item.code} className="hover:bg-muted/50 transition-colors group">
                                            <td className="p-4 font-medium flex items-center justify-start gap-2">
                                                <div className={cn(
                                                    "w-1 h-6 rounded-full",
                                                    item.returnRate > 0 ? "bg-green-500" : item.returnRate < 0 ? "bg-red-500" : "bg-gray-400"
                                                )} />
                                                <StockLogo symbol={item.code} logoUrl={item.logoUrl} />
                                                {item.code}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-xs text-muted-foreground">{formatPercent(item.weight)}</span>
                                                    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary"
                                                            style={{ width: `${item.weight}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={cn("p-2 sm:p-4 text-center font-medium text-xs sm:text-sm whitespace-nowrap",
                                                item.returnRate > 0 ? "text-green-600" : item.returnRate < 0 ? "text-red-600" : "text-gray-600"
                                            )}>
                                                <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                                                    {item.returnRate > 0 ? <ArrowUpIcon className="w-3 h-3 flex-shrink-0" /> :
                                                        item.returnRate < 0 ? <ArrowDownIcon className="w-3 h-3 flex-shrink-0" /> :
                                                            <MinusIcon className="w-3 h-3 flex-shrink-0" />}
                                                    <span className="truncate">%{formatNumber(Math.abs(item.returnRate), 2)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-mono">{formatNumber(item.quantity)}</td>
                                            <td className="p-4 text-center font-mono">
                                                {isItemFund ? formatFundPrice(item.prevClose) :
                                                    item.isForeign ? `$${formatNumber(item.prevClose)}` :
                                                        formatNumber(item.prevClose)}
                                            </td>
                                            <td className="p-4 text-center font-mono font-medium">
                                                {isItemFund ? formatFundPrice(item.currentPrice) :
                                                    item.isForeign ? `$${formatNumber(item.currentPrice)}` :
                                                        formatNumber(item.currentPrice)}
                                            </td>
                                            <td className="p-4 text-center font-mono font-medium">{formatNumber(item.currentValue)}</td>
                                            <td className={cn("p-2 sm:p-4 text-center font-medium font-mono text-xs sm:text-sm whitespace-nowrap",
                                                item.profitTL > 0 ? "text-green-600" : item.profitTL < 0 ? "text-red-600" : "text-gray-600"
                                            )}>
                                                {item.profitTL > 0 ? '+' : ''}{formatCurrency(item.profitTL)}
                                            </td>
                                            {(onEdit || onDelete) && (
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {onEdit && (
                                                            <button
                                                                onClick={() => onEdit(item)}
                                                                className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Düzenle"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {onDelete && (
                                                            <button
                                                                onClick={() => onDelete(item.code)}
                                                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Sil"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <PortfolioPieChartDialog
                isOpen={isPieChartOpen}
                onClose={() => setIsPieChartOpen(false)}
                data={data}
            />
        </>
    )
}
