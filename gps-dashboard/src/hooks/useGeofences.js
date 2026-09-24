import { useEffect, useState } from 'react'
import { fetchGeofences } from '../lib/queries'
import { supabase } from '../lib/supabase'

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
        if (!cancelled) {
          setError(err.message)
          setGeofences((prev) => (prev && prev.length > 0 ? prev : []))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadGeofences()

    if (!supabase) {
      return () => {
        cancelled = true
      }
    }

    const channel = supabase
      .channel('geofences-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'geofences' },
        () => {
          if (!cancelled) loadGeofences()
        }
      )
      .subscribe((status, err) => {
        if (!cancelled && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
          console.warn('Geofences realtime error:', status, err)
          setError(`Realtime error: ${status}`)
        }
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return { geofences, isLoading, error }
}