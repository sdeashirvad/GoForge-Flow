import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { Panel } from '@/components/design-system/Panel'
import { ChartContainer } from '@/components/design-system/ChartContainer'
import { Activity } from 'lucide-react'
import { EmptyState } from '@/components/design-system/EmptyState'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <span className="text-muted-foreground">Throughput: </span>
      <span className="font-medium">{payload[0].value} jobs</span>
    </div>
  )
}

export function ThroughputSparkline({ history = [] }) {
  if (history.length < 2) {
    return (
      <Panel title="Throughput" description="Completed jobs over time (live)">
        <EmptyState
          icon={Activity}
          title="Collecting metrics"
          description="Throughput data appears as jobs complete."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Throughput" description="Completed job count snapshots (live)">
      <ChartContainer height={200}>
        {(theme) => (
          <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="hsl(var(--primary))"
              fill="url(#throughputGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        )}
      </ChartContainer>
    </Panel>
  )
}
