import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function AnimatedNumber({ value, className }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const start = prevRef.current
    const end = value
    if (start === end) return

    const duration = 300
    const startTime = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else prevRef.current = end
    }

    requestAnimationFrame(tick)
  }, [value])

  return (
    <span className={cn('tabular-nums', className)} key={value}>
      {display}
    </span>
  )
}
