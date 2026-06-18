import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CHART_COLORS = {
  Queued: '#71717a',
  Running: '#3b82f6',
  Completed: '#22c55e',
  Failed: '#ef4444',
  Scheduled: '#f59e0b',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
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

  if (!chartData.some((d) => d.value > 0)) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((d) => (
                <Cell
                  key={d.name}
                  fill={CHART_COLORS[d.name]}
                  opacity={d.value === 0 ? 0.25 : 0.9}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
