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
import { formatCurrency, formatNumber, formatFundPrice, formatPercent, cn, isFund } from "@/lib/utils"
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, Trash2, Pencil, PieChart } from "lucide-react"
import { PortfolioPieChartDialog } from './PortfolioPieChartDialog'
import StockLogo from './StockLogo'

export function PortfolioTable({ data, onDelete, onEdit, onUpdateLogo, fundCode }) {
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
                                    const isItemFund = isFund(item.code, item.isForeign)
                                    // Debug log for first item only to avoid spam
                                    if (item === data[0]) console.log('📊 PortfolioTable prop onUpdateLogo:', typeof onUpdateLogo)

                                    return (
                                        <tr key={item.code} className="hover:bg-muted/50 transition-colors group">
                                            <td className="p-4 font-medium flex items-center justify-start gap-2">
                                                <div className={cn(
                                                    "w-1 h-6 rounded-full",
                                                    item.returnRate > 0 ? "bg-green-500" : item.returnRate < 0 ? "bg-red-500" : "bg-gray-400"
                                                )} />
                                                <div
                                                    onClick={(e) => {
                                                        console.log('🖱️ Div clicked for', item.code);
                                                        e.stopPropagation(); // Prevent row click if any
                                                        onUpdateLogo && onUpdateLogo(item);
                                                    }}
                                                    className={cn("transition-transform hover:scale-110 relative z-10", onUpdateLogo && "cursor-pointer")}
                                                    title={onUpdateLogo ? "Logoyu Düzenle" : ""}
                                                >
                                                    <StockLogo symbol={item.code} logoUrl={item.logoUrl} />
                                                </div>
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
                                            <td className="p-4 text-center text-muted-foreground">{formatNumber(item.quantity)}</td>
                                            <td className="p-4 text-center text-muted-foreground">{formatFundPrice(item.prevClose, isItemFund)}</td>
                                            <td className="p-4 text-center font-medium">{formatFundPrice(item.currentPrice, isItemFund)}</td>
                                            <td className="p-4 text-center font-medium">{formatCurrency(item.value)}</td>
                                            <td className={cn("p-4 text-center font-bold",
                                                item.profit > 0 ? "text-green-600" : item.profit < 0 ? "text-red-600" : "text-gray-600"
                                            )}>
                                                {formatCurrency(item.profit)}
                                            </td>
                                            {(onEdit || onDelete) && (
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {onEdit && (
                                                            <button
                                                                onClick={() => onEdit(item)}
                                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                                title="Düzenle"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {onDelete && (
                                                            <button
                                                                onClick={() => onDelete(item.code)}
                                                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
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
