import { useEffect, useState } from 'react'
import { fetchGeofences } from '../lib/queries'
import { initialGeofences } from '../data/geofencesData'

export const useGeofences = () => {
  const [geofences, setGeofences] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadGeofences = async () => {
      setIsLoading(true)
      try {
        const data = await fetchGeofences()
        if (!cancelled) {
          setGeofences(data)
          setError(null)
        }
      } catch (err) {
        setError(err.message)
        if (!cancelled) {
          setGeofences(initialGeofences)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadGeofences()

    return () => {
      cancelled = true
    }
  }, [])

  return { geofences, isLoading, error }
}