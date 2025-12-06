import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) {
        return '₺0,00'
    }
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value)
}

export function formatNumber(value, maxDecimals = 3) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0'
    }
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals,
    }).format(value)
}

export function formatFundPrice(value, isFund = true) {
    if (value === null || value === undefined || isNaN(value)) {
        return isFund ? '0,000000' : '0,00'
    }
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: isFund ? 6 : 2,
        maximumFractionDigits: isFund ? 6 : 2,
    }).format(value)
}

export function formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '%0,00'
    }
    return new Intl.NumberFormat('tr-TR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value / 100)
}

// Helper to check if a symbol is a fund
// Foreign stocks (even 3 letters) are NOT funds
export function isFund(code, isForeign = false) {
    if (!code) return false
    if (isForeign) return false
    return code.length === 3 || code.toUpperCase().includes('FON')
}
