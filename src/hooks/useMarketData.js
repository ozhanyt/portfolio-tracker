import { useEffect, useState } from 'react'
import { fetchMarketData } from '@/services/marketDataService'

/**
 * Hook to fetch market indicators at regular intervals
 * Shows loading only when no data exists, keeps old data during updates
 */
export function useMarketData(intervalMs = 300000) {
  const [marketData, setMarketData] = useState([])

  useEffect(() => {
    const updateMarketData = async () => {
      const data = await fetchMarketData()
      console.log('📊 Market Data Response:', data);
      setMarketData(data)
    }

    updateMarketData()
    const interval = setInterval(updateMarketData, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs])

  return { marketData, isLoading: marketData.length === 0 }
}
