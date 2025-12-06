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

export function PortfolioTable({ data, onDelete, onEdit, onUpdateLogo, fundCode }) {
    const [isPieChartOpen, setIsPieChartOpen] = useState(false)

    return (
        <>
            {/* ... */}
            <td className="p-4 font-medium flex items-center justify-start gap-2">
                <div className={cn(
                    "w-1 h-6 rounded-full",
                    item.returnRate > 0 ? "bg-green-500" : item.returnRate < 0 ? "bg-red-500" : "bg-gray-400"
                )} />
                <div
                    onClick={() => onUpdateLogo && onUpdateLogo(item)}
                    className={cn("transition-transform hover:scale-110", onUpdateLogo && "cursor-pointer")}
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
        </tr >
                                    )
})}
                            </tbody >
                        </table >
                    </div >
                </CardContent >
            </Card >

    <PortfolioPieChartDialog
        isOpen={isPieChartOpen}
        onClose={() => setIsPieChartOpen(false)}
        data={data}
    />
        </>
    )
}
