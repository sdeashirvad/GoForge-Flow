import { FileSpreadsheet, ScrollText, Globe } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { WIZARD_STEPS } from './constants'
import { cn } from '@/lib/utils'

const ICONS = {
  csv_processing: FileSpreadsheet,
  log_analysis: ScrollText,
  monitoring: Globe,
}

export function WizardSteps({ currentStep }) {
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100

  return (
    <div className="space-y-4">
      <Progress value={progress} className="h-1.5" />
      <div className="hidden sm:flex justify-between gap-1">
        {WIZARD_STEPS.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              'flex-1 text-center text-xs font-medium transition-colors',
              i <= currentStep ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {step.label}
          </div>
        ))}
      </div>
      <p className="sm:hidden text-sm text-muted-foreground">
        Step {currentStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep].label}
      </p>
    </div>
  )
}

export { ICONS }
