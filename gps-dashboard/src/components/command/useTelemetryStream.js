import { useEffect, useRef, useState } from 'react'

export const useTelemetryStream = (entity, maxPoints = 28) => {
  const [samples, setSamples] = useState(() => Array.from({ length: maxPoints }, () => 0))
  const idRef = useRef(null)
  const speedRef = useRef(0)

  useEffect(() => {
    speedRef.current = Number(entity?.speed) || 0
  }, [entity?.speed])

  useEffect(() => {
    const id = entity?.id || null
    if (id !== idRef.current) {
      idRef.current = id
      setSamples(Array.from({ length: maxPoints }, () => 0))
    }
    if (!id) return undefined

    const timer = setInterval(() => {
      setSamples((prev) => {
        const next = Math.max(0, Math.min(130, speedRef.current))
        return [...prev.slice(1), next]
      })
    }, 900)
    return () => clearInterval(timer)
  }, [entity?.id, maxPoints])

  return samples
}

export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}