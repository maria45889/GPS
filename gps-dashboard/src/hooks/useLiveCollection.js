import { useEffect, useRef, useState, useCallback } from 'react'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

export const useLiveCollection = ({ fetchFn, subscribeTables = [] }) => {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [isStale, setIsStale] = useState(false)
  const reqSeqRef = useRef(0)
  const isFetchingRef = useRef(false)
  const pendingRefetchRef = useRef(false)
  const lastSyncTimeRef = useRef(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    let cancelled = false
    let debounceTimer = null

    const loadData = async () => {
      if (isFetchingRef.current) {
        pendingRefetchRef.current = true
        return
      }
      isFetchingRef.current = true
      const currentSeq = ++reqSeqRef.current
      setIsLoading(true)
      try {
        const result = await fetchFn()

        if (!cancelled && currentSeq === reqSeqRef.current) {
          setData(result)
          setError(null)
          const now = Date.now()
          setLastSyncTime(now)
          lastSyncTimeRef.current = now
          setIsStale(false)
        }
      } catch (err) {
        if (!cancelled && currentSeq === reqSeqRef.current) {
          setError(err.message || 'Error al cargar datos')
          setIsStale(true)
        }
      } finally {
        if (!cancelled && currentSeq === reqSeqRef.current) {
          setIsLoading(false)
        }
        isFetchingRef.current = false
        if (pendingRefetchRef.current && !cancelled) {
          pendingRefetchRef.current = false
          loadData()
        }
      }
    }

    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!cancelled) loadData()
      }, 500)
    }

    loadData()

    const pollInterval = setInterval(() => {
      if (!cancelled) loadData()
    }, 30000)

    const staleInterval = setInterval(() => {
      if (!cancelled && lastSyncTimeRef.current) {
        if (Date.now() - lastSyncTimeRef.current > 45000) {
          setIsStale(true)
        }
      }
    }, 5000)

    const handleFocusOrVisibility = () => {
      if (!cancelled && document.visibilityState !== 'hidden') {
        loadData()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrVisibility)
      document.addEventListener('visibilitychange', handleFocusOrVisibility)
    }

    let channel = null
    if (hasSupabaseConfig && supabase && subscribeTables.length > 0) {
      channel = supabase.channel(`live-collection-${Math.random().toString(36).substr(2, 9)}`)
      subscribeTables.forEach(table => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, debouncedLoad)
      })
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (!cancelled) loadData()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          debouncedLoad()
        }
      })
    }

    return () => {
      cancelled = true
      if (debounceTimer) clearTimeout(debounceTimer)
      clearInterval(pollInterval)
      clearInterval(staleInterval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusOrVisibility)
        document.removeEventListener('visibilitychange', handleFocusOrVisibility)
      }
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [refetchTrigger]) // fetchFn and subscribeTables are stable by convention

  const refetch = useCallback(() => setRefetchTrigger(t => t + 1), [])

  return { data, setData, isLoading, error, lastSyncTime, isStale, refetch }
}
