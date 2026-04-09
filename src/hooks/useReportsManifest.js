import { useEffect, useState } from 'react'

const EMPTY_MANIFEST = {
  gunluk: [],
  haftalik: [],
  aylik: [],
}

export function useReportsManifest() {
  const [manifest, setManifest] = useState(EMPTY_MANIFEST)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadManifest() {
      try {
        const response = await fetch(`/report-assets/manifest.json?t=${Date.now()}`)
        if (!response.ok) {
          throw new Error('Rapor manifesti yüklenemedi.')
        }

        const data = await response.json()
        if (!isMounted) return

        setManifest({
          gunluk: Array.isArray(data.gunluk) ? data.gunluk : [],
          haftalik: Array.isArray(data.haftalik) ? data.haftalik : [],
          aylik: Array.isArray(data.aylik) ? data.aylik : [],
        })
      } catch (err) {
        if (!isMounted) return
        setError(err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadManifest()

    return () => {
      isMounted = false
    }
  }, [])

  return { manifest, isLoading, error }
}
