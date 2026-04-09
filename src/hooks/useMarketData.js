import { useEffect, useState } from 'react'
import { fetchMarketData } from '@/services/marketDataService'

const HIDDEN_POLL_MS = 5 * 60 * 1000

/**
 * Hook to fetch market indicators at regular intervals
 * Shows loading only when no data exists, keeps old data during updates
 */
export function useMarketData(intervalMs = 300000) {
  const [marketData, setMarketData] = useState([])

  const getCurrentInterval = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      return HIDDEN_POLL_MS
    }
    return intervalMs
  }

  useEffect(() => {
    let timeoutId = null
    let cancelled = false

    const updateMarketData = async () => {
      try {
        const data = await fetchMarketData()
        if (!cancelled) {
          setMarketData(data)
        }
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(updateMarketData, getCurrentInterval())
        }
      }
    }

    const handleVisibilityChange = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (!document.hidden) {
        updateMarketData()
      } else {
        timeoutId = setTimeout(updateMarketData, getCurrentInterval())
      }
    }

    updateMarketData()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intervalMs])

  return { marketData, isLoading: marketData.length === 0 }
}
