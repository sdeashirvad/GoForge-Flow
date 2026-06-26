import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const [colors, setColors] = useState({
    grid: 'hsl(240 4% 16%)',
    axis: 'hsl(240 5% 65%)',
    tooltipBg: 'hsl(240 4% 7%)',
    tooltipBorder: 'hsl(240 4% 16%)',
    tooltipText: 'hsl(0 0% 98%)',
  })

  useEffect(() => {
    const root = document.documentElement
    const style = getComputedStyle(root)
    const get = (v) => `hsl(${style.getPropertyValue(v).trim()})`

    setColors({
      grid: get('--border'),
      axis: get('--muted-foreground'),
      tooltipBg: get('--card'),
      tooltipBorder: get('--border'),
      tooltipText: get('--foreground'),
    })
  }, [resolvedTheme])

  return colors
}
