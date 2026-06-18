import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function MetricCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className={cn('h-4 w-4 text-muted-foreground', accent)} />}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold tabular-nums', accent || 'text-foreground')}>
          {value ?? '—'}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
