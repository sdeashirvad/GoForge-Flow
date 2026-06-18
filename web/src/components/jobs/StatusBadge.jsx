import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }) {
  const variant = ['queued', 'running', 'completed', 'failed', 'scheduled'].includes(status)
    ? status
    : 'queued'

  return (
    <Badge variant={variant} className="gap-1.5 capitalize">
      {status === 'running' && (
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}
      {status}
    </Badge>
  )
}
