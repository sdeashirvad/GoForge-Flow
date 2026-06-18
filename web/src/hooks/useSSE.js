import { useEffect, useRef, useCallback } from 'react'

// Server-Sent Events for live job updates
export function useSSE(onMessage) {
  const onMsg = useRef(onMessage)
  const esRef = useRef(null)
  const retryTimer = useRef(null)

  useEffect(() => { onMsg.current = onMessage }, [onMessage])

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const es = new EventSource('/api/events')
    esRef.current = es

    es.onopen = () => {
      onMsg.current({ type: '_connected' })
    }

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        onMsg.current(event)
      } catch {}
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      onMsg.current({ type: '_disconnected' })
      retryTimer.current = setTimeout(connect, 3000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(retryTimer.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [connect])
}
