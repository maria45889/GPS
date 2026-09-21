import { useEffect, useState } from 'react'
import { fetchAlerts } from '../lib/queries'
import { initialAlerts } from '../data/alertsData'
import { supabase } from '../lib/supabase'

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
        if (!cancelled) {
          setError(err.message)
          setAlerts((prev) => (prev && prev.length > 0 ? prev : (import.meta.env.VITE_SUPABASE_URL ? [] : initialAlerts)))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadAlerts()

    if (!supabase) {
      return () => {
        cancelled = true
      }
    }

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          if (!cancelled) loadAlerts()
        }
      )
      .subscribe((status, err) => {
        if (!cancelled && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
          console.warn('Alerts realtime error:', status, err)
          setError(`Realtime error: ${status}`)
        }
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return { alerts, isLoading, error }
}