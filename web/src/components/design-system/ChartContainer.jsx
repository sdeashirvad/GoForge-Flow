import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useChartTheme } from '@/hooks/useChartTheme'

export function ChartContainer({ children, className, height = 240 }) {
  const theme = useChartTheme()

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {typeof children === 'function' ? children(theme) : children}
      </ResponsiveContainer>
    </div>
  )
}
