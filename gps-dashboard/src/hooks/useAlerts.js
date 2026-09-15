import { useEffect, useState } from 'react'
import { fetchAlerts } from '../lib/queries'
import { initialAlerts } from '../data/alertsData'

export const useAlerts = () => {
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadAlerts = async () => {
      setIsLoading(true)
      try {
        const data = await fetchAlerts()
        if (!cancelled) {
          setAlerts(data)
          setError(null)
        }
      } catch (err) {
        setError(err.message)
        if (!cancelled) {
          setAlerts(initialAlerts)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadAlerts()

    return () => {
      cancelled = true
    }
  }, [])

  return { alerts, isLoading, error }
}