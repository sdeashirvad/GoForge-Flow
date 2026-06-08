package workers

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"sync"
	"time"

	"github.com/flowforge/flowforge-go/internal/ai"
	"github.com/flowforge/flowforge-go/internal/jobs"
	"github.com/flowforge/flowforge-go/internal/queue"
	"github.com/flowforge/flowforge-go/internal/storage"
	"github.com/flowforge/flowforge-go/internal/ws"
	"gorm.io/gorm"
)

// Pool manages a fixed set of goroutine workers that drain the job queue.
type Pool struct {
	size       int
	queue      queue.JobQueue
	executor   *jobs.Executor
	db         *gorm.DB
	ai         *ai.GroqDiagnosticsEngine
	hub        *ws.Hub
	wg         sync.WaitGroup
	cancelFn   context.CancelFunc
	activeJobs sync.Map
}

func NewPool(size int, q queue.JobQueue, db *gorm.DB, hub *ws.Hub) *Pool {
	return &Pool{
		size:     size,
		queue:    q,
		executor: jobs.NewExecutor(db),
		db:       db,
		ai:       ai.NewGroqEngine(),
		hub:      hub,
	}
}

// Start launches all worker goroutines and blocks until context cancellation.
func (p *Pool) Start(ctx context.Context) {
	workerCtx, cancel := context.WithCancel(ctx)
	p.cancelFn = cancel

	slog.Info("worker pool starting", "size", p.size)

	for i := 0; i < p.size; i++ {
		workerID := fmt.Sprintf("worker-%02d", i+1)
		p.wg.Add(1)
		go p.runWorker(workerCtx, workerID)
	}

	<-ctx.Done()
	slog.Info("worker pool received shutdown signal, draining...")
	p.wg.Wait()
	slog.Info("worker pool shutdown complete")
}

func (p *Pool) runWorker(ctx context.Context, workerID string) {
	defer p.wg.Done()
	slog.Info("worker started", "worker_id", workerID)

	for {
		job, err := p.queue.Dequeue(ctx)
		if err != nil || job == nil {
			slog.Info("worker exiting", "worker_id", workerID, "reason", err)
			return
		}

		p.processJob(ctx, job, workerID)
	}
}

func (p *Pool) processJob(ctx context.Context, job *storage.Job, workerID string) {
	p.activeJobs.Store(job.ID, workerID)
	defer p.activeJobs.Delete(job.ID)

	now := time.Now()
	job.Status = storage.StatusRunning
	job.StartedAt = &now
	job.WorkerID = workerID
	p.db.Save(job)
	p.hub.Broadcast("job_updated", job)

	slog.Info("job started", "job_id", job.ID, "type", job.Type, "worker", workerID, "attempt", job.RetryCount+1)

	jobCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	err := p.executor.Execute(jobCtx, job, workerID)

	end := time.Now()
	durationMs := end.Sub(now).Milliseconds()
	job.DurationMs = &durationMs
	job.CompletedAt = &end

	if err != nil {
		p.handleFailure(ctx, job, err)
	} else {
		job.Status = storage.StatusCompleted
		p.db.Save(job)
		p.hub.Broadcast("job_updated", job)
		slog.Info("job completed", "job_id", job.ID, "duration_ms", durationMs)
	}
}

func (p *Pool) handleFailure(ctx context.Context, job *storage.Job, execErr error) {
	errMsg := execErr.Error()
	job.ErrorMessage = errMsg

	// Record retry history
	p.db.Create(&storage.RetryHistory{
		JobID:      job.ID,
		AttemptNum: job.RetryCount + 1,
		StartedAt:  *job.StartedAt,
		FailedAt:   time.Now(),
		ErrorMsg:   errMsg,
	})

	if job.RetryCount < job.MaxRetries {
		backoff := backoffSeconds(job.RetryCount)
		job.RetryCount++
		job.Status = storage.StatusQueued
		job.WorkerID = ""
		p.db.Save(job)
		p.hub.Broadcast("job_updated", job)

		slog.Warn("job failed, scheduling retry",
			"job_id", job.ID,
			"attempt", job.RetryCount,
			"max_retries", job.MaxRetries,
			"backoff_secs", backoff,
			"error", errMsg,
		)

		p.db.Model(&storage.RetryHistory{}).
			Where("job_id = ? AND attempt_num = ?", job.ID, job.RetryCount).
			Update("backoff_secs", backoff)

		go func(delay time.Duration, j *storage.Job) {
			select {
			case <-time.After(delay):
				p.queue.Enqueue(j)
			case <-ctx.Done():
			}
		}(time.Duration(backoff)*time.Second, job)

	} else {
		job.Status = storage.StatusFailed
		p.db.Save(job)
		p.hub.Broadcast("job_updated", job)

		slog.Error("job permanently failed",
			"job_id", job.ID,
			"retries", job.RetryCount,
			"error", errMsg,
		)

		go p.generateDiagnostic(job)
	}
}

func (p *Pool) generateDiagnostic(job *storage.Job) {
	var logs []storage.JobLog
	p.db.Where("job_id = ?", job.ID).Find(&logs)

	diag, err := p.ai.Diagnose(job, logs)
	if err != nil {
		slog.Error("diagnostic generation failed", "job_id", job.ID, "error", err)
		return
	}

	p.db.Where("job_id = ?", job.ID).Delete(&storage.JobDiagnostic{})
	p.db.Create(diag)

	p.hub.Broadcast("job_diagnosed", map[string]any{"job_id": job.ID, "diagnostic": diag})
	slog.Info("diagnostic generated", "job_id", job.ID, "model", diag.ModelUsed)
}

// backoffSeconds returns exponential backoff: 2^attempt seconds, capped at 60s.
func backoffSeconds(attempt int) int {
	secs := math.Pow(2, float64(attempt))
	if secs > 60 {
		secs = 60
	}
	return int(secs)
}

// ActiveCount returns how many jobs are currently executing.
func (p *Pool) ActiveCount() int {
	count := 0
	p.activeJobs.Range(func(_, _ any) bool {
		count++
		return true
	})
	return count
}
