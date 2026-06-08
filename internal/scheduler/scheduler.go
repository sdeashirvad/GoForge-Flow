package scheduler

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/flowforge/flowforge-go/internal/queue"
	"github.com/flowforge/flowforge-go/internal/storage"
	"gorm.io/gorm"
)

// Scheduler polls for jobs whose scheduled_at time has arrived and enqueues them.
type Scheduler struct {
	db       *gorm.DB
	queue    queue.JobQueue
	interval time.Duration
}

func New(db *gorm.DB, q queue.JobQueue) *Scheduler {
	return &Scheduler{
		db:       db,
		queue:    q,
		interval: 10 * time.Second,
	}
}

func (s *Scheduler) Run(ctx context.Context) {
	slog.Info("scheduler started", "poll_interval", s.interval)
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Also seed a recurring monitoring job on startup
	s.seedMonitoringJob()

	for {
		select {
		case <-ticker.C:
			s.poll()
		case <-ctx.Done():
			slog.Info("scheduler stopped")
			return
		}
	}
}

func (s *Scheduler) poll() {
	var jobs []storage.Job
	now := time.Now()

	result := s.db.Where(
		"status = ? AND scheduled_at IS NOT NULL AND scheduled_at <= ?",
		storage.StatusScheduled, now,
	).Find(&jobs)

	if result.Error != nil {
		slog.Error("scheduler poll error", "error", result.Error)
		return
	}

	for _, job := range jobs {
		j := job
		slog.Info("scheduler dispatching job", "job_id", j.ID, "type", j.Type)
		j.Status = storage.StatusQueued
		s.db.Save(&j)
		s.queue.Enqueue(&j)
	}
}

func (s *Scheduler) seedMonitoringJob() {
	// Schedule a monitoring job 30s from now as a demo
	in30 := time.Now().Add(30 * time.Second)
	payload, _ := json.Marshal(map[string]any{
		"endpoint":   "https://api.example.com/health",
		"timeout_ms": 5000,
	})
	job := &storage.Job{
		Type:        storage.JobTypeMonitoring,
		Status:      storage.StatusScheduled,
		Priority:    storage.PriorityNormal,
		Payload:     string(payload),
		MaxRetries:  2,
		ScheduledAt: &in30,
	}
	s.db.Create(job)
	slog.Info("seeded scheduled monitoring job", "job_id", job.ID, "runs_at", in30.Format(time.RFC3339))
}
