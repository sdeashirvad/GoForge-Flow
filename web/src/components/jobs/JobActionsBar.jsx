import { Sparkles, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

export function JobActionsBar({
  job,
  diagnostic,
  diagLoading,
  retrying,
  deleting,
  deleteOpen,
  setDeleteOpen,
  onDiagnose,
  onRetry,
  onDelete,
}) {
  const isFailed = job?.status === 'failed'
  const isDone = job?.status === 'completed' || job?.status === 'failed'
  const canRetry = isFailed && job.retry_count < job.max_retries

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">
        {isFailed && (
          <p>
            {canRetry
              ? 'This job failed. Retry to re-queue with exponential backoff.'
              : 'Max retries reached. Run AI diagnose for root cause analysis.'}
          </p>
        )}
        {job?.status === 'running' && (
          <p>Job is executing. Logs update on completion.</p>
        )}
        {job?.status === 'queued' && (
          <p>Waiting in queue for an available worker.</p>
        )}
        {job?.status === 'completed' && (
          <p>Job completed successfully.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {isDone && (
          <Button variant="outline" size="sm" onClick={onDiagnose} disabled={diagLoading}>
            <Sparkles className="h-4 w-4" />
            {diagLoading ? 'Analysing…' : diagnostic ? 'Re-diagnose' : 'AI Diagnose'}
          </Button>
        )}
        {isFailed && (
          <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
            <RotateCcw className="h-4 w-4" />
            {retrying ? 'Retrying…' : 'Retry'}
          </Button>
        )}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete job?</DialogTitle>
              <DialogDescription>
                This permanently removes the job and all logs, retries, and diagnostics.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={onDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
