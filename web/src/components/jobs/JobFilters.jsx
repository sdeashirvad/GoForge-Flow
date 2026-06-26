import { cn } from '@/lib/utils'
import { getRetryingBadge } from './StatusBadge'

const filters = [
  { value: '', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'scheduled', label: 'Scheduled' },
]

const typeFilters = [
  { value: '', label: 'All types' },
  { value: 'csv_processing', label: 'CSV' },
  { value: 'log_analysis', label: 'Logs' },
  { value: 'monitoring', label: 'Monitor' },
]

export function JobFilters({ value, onChange, typeValue, onTypeChange }) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              'h-9 px-3 rounded-lg text-sm font-medium transition-all min-h-[36px]',
              value === f.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            aria-pressed={value === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>
      {onTypeChange && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onTypeChange(f.value)}
              className={cn(
                'h-9 px-3 rounded-lg text-xs font-medium transition-all border',
                typeValue === f.value
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-border hover:bg-accent'
              )}
              aria-pressed={typeValue === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { getRetryingBadge }
