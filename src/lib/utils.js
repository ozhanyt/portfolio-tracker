import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '₺0,00'
    }
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
