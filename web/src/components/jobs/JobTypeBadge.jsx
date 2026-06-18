import { FileSpreadsheet, ScrollText, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const config = {
  csv_processing: { label: 'CSV', icon: FileSpreadsheet, className: 'border-violet-600/40 bg-violet-950/50 text-violet-300' },
  log_analysis: { label: 'Logs', icon: ScrollText, className: 'border-cyan-600/40 bg-cyan-950/50 text-cyan-300' },
  monitoring: { label: 'Monitor', icon: Globe, className: 'border-orange-600/40 bg-orange-950/50 text-orange-300' },
}

export function JobTypeBadge({ type }) {
  const c = config[type] || { label: type, icon: Globe, className: 'border-border bg-muted text-muted-foreground' }
  const Icon = c.icon
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-normal', c.className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  )
}
