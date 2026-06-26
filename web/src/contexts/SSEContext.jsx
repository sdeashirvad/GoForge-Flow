import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const SSEContext = createContext(null)

export function SSEProvider({ children }) {
  const [status, setStatus] = useState('connecting')
  const listenersRef = useRef(new Set())
  const esRef = useRef(null)
  const retryTimer = useRef(null)
  const intentionalClose = useRef(false)

  const broadcast = useCallback((event) => {
    listenersRef.current.forEach((fn) => {
      try {
        fn(event)
      } catch {
        // ignore listener errors
      }
    })
  }, [])

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn)
    return () => listenersRef.current.delete(fn)
  }, [])

  useEffect(() => {
    const connect = () => {
      intentionalClose.current = false

      if (esRef.current) {
        intentionalClose.current = true
        esRef.current.close()
        esRef.current = null
        intentionalClose.current = false
      }

      setStatus('connecting')
      const es = new EventSource('/api/events')
      esRef.current = es

      es.onopen = () => {
        setStatus('connected')
        broadcast({ type: '_connected' })
      }

      es.onmessage = (e) => {
        try {
          broadcast(JSON.parse(e.data))
        } catch {
          // ignore malformed events
        }
      }

      es.onerror = () => {
        if (intentionalClose.current) return

        es.close()
        esRef.current = null
        setStatus('disconnected')
        broadcast({ type: '_disconnected' })
        retryTimer.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      intentionalClose.current = true
      clearTimeout(retryTimer.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [broadcast])

  return (
    <SSEContext.Provider value={{ status, subscribe }}>
      {children}
    </SSEContext.Provider>
  )
}

export function useConnectionStatus() {
  const ctx = useContext(SSEContext)
  return ctx?.status ?? 'disconnected'
}

export function useSSE(onMessage) {
  const ctx = useContext(SSEContext)
  const onMsg = useRef(onMessage)

  useEffect(() => {
    onMsg.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!ctx) return undefined
    return ctx.subscribe((event) => onMsg.current(event))
  }, [ctx])
}
