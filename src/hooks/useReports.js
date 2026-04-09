import { useEffect, useState } from 'react'
import { subscribeToReports } from '@/services/reportService'

export function useReports() {
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToReports((items) => {
      setReports(items)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { reports, isLoading }
}
