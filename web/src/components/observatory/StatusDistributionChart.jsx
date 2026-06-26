import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Panel } from '@/components/design-system/Panel'
import { ChartContainer } from '@/components/design-system/ChartContainer'
import { EmptyState } from '@/components/design-system/EmptyState'
import { BarChart3 } from 'lucide-react'

const CHART_COLORS = {
  Queued: 'hsl(var(--status-queued))',
  Running: 'hsl(var(--status-running))',
  Completed: 'hsl(var(--status-completed))',
  Failed: 'hsl(var(--status-failed))',
  Scheduled: 'hsl(var(--status-scheduled))',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground">{payload[0].value}</span>
    </div>
  )
}

export function StatusDistributionChart({ stats }) {
  if (!stats) return null

  const chartData = [
    { name: 'Queued', value: stats.queued },
    { name: 'Running', value: stats.running },
    { name: 'Completed', value: stats.completed },
    { name: 'Failed', value: stats.failed },
    { name: 'Scheduled', value: stats.scheduled },
  ]

  if (!chartData.some((d) => d.value > 0)) {
    return (
      <Panel title="Status Distribution">
        <EmptyState
          icon={BarChart3}
          title="No job data yet"
          description="Run the load demo or create jobs to see distribution."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Status Distribution" description="Current job counts by lifecycle state">
      <ChartContainer height={200}>
        {(theme) => (
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: theme.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: theme.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((d) => (
                <Cell
                  key={d.name}
                  fill={CHART_COLORS[d.name]}
                  opacity={d.value === 0 ? 0.2 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        )}
      </ChartContainer>
    </Panel>
  )
}
