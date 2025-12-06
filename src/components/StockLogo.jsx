import React, { useState } from 'react';

// Predefined vibrant colors for avatars
const COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    'bg-rose-500'
];

/**
 * Generates a consistent color index from a string
 */
const getColorIndex = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % COLORS.length);
};

export default function StockLogo({ symbol, logoUrl, className = "w-8 h-8" }) {
    const [error, setError] = useState(false);

    // If we have a valid URL and no error, show the image
    if (logoUrl && !error) {
        return (
            <img
                src={logoUrl}
                alt={symbol}
                className={`${className} rounded-full object-cover border border-gray-700`}
                onError={() => setError(true)}
            />
        );
    }

    // Fallback: Generated Avatar
    const colorClass = COLORS[getColorIndex(symbol || '')];

    return (
        <div
            className={`${className} ${colorClass} rounded-full flex items-center justify-center text-white font-bold text-xs border border-white/10 shadow-sm`}
            title={symbol}
        >
            {symbol ? symbol.substring(0, 2).toUpperCase() : '?'}
        </div>
    );
}
