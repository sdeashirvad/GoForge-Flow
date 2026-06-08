package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/flowforge/flowforge-go/internal/ai"
	"github.com/flowforge/flowforge-go/internal/queue"
	"github.com/flowforge/flowforge-go/internal/storage"
	"github.com/flowforge/flowforge-go/internal/workers"
	"gorm.io/gorm"
)

type Handler struct {
	db   *gorm.DB
	q    queue.JobQueue
	pool *workers.Pool
	ai   *ai.GroqDiagnosticsEngine
}

func NewHandler(db *gorm.DB, q queue.JobQueue, pool *workers.Pool) *Handler {
	return &Handler{
		db:   db,
		q:    q,
		pool: pool,
		ai:   ai.NewGroqEngine(),
	}
}

// --- helpers ---

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeBody(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

// --- handlers ---

// POST /api/jobs
func (h *Handler) CreateJob(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type        storage.JobType     `json:"type"`
		Priority    storage.JobPriority `json:"priority"`
		Payload     any                 `json:"payload"`
		MaxRetries  int                 `json:"max_retries"`
		ScheduledAt *time.Time          `json:"scheduled_at"`
	}
	if err := decodeBody(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	if req.Type == "" {
		writeErr(w, http.StatusBadRequest, "type is required")
		return
	}
	validTypes := map[storage.JobType]bool{
		storage.JobTypeCSV:         true,
		storage.JobTypeLogAnalysis: true,
		storage.JobTypeMonitoring:  true,
	}
	if !validTypes[req.Type] {
		writeErr(w, http.StatusBadRequest, fmt.Sprintf(
			"invalid job type: %s. Valid: csv_processing, log_analysis, monitoring", req.Type))
		return
	}
	if req.Priority == "" {
		req.Priority = storage.PriorityNormal
	}
	if req.MaxRetries == 0 {
		req.MaxRetries = 3
	}

	payloadBytes, _ := json.Marshal(req.Payload)
	job := &storage.Job{
		Type:        req.Type,
		Priority:    req.Priority,
		Payload:     string(payloadBytes),
		MaxRetries:  req.MaxRetries,
		ScheduledAt: req.ScheduledAt,
	}
	if req.ScheduledAt != nil && req.ScheduledAt.After(time.Now()) {
		job.Status = storage.StatusScheduled
	} else {
		job.Status = storage.StatusQueued
	}

	if err := h.db.Create(job).Error; err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to create job")
		return
	}
	if job.Status == storage.StatusQueued {
		h.q.Enqueue(job)
	}

	slog.Info("job created", "job_id", job.ID, "type", job.Type, "status", job.Status)
	writeJSON(w, http.StatusCreated, job)
}

// GET /api/jobs
func (h *Handler) ListJobs(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	jobType := r.URL.Query().Get("type")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	query := h.db.Model(&storage.Job{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if jobType != "" {
		query = query.Where("type = ?", jobType)
	}

	var total int64
	query.Count(&total)

	var jobs []storage.Job
	query.Order("created_at desc").Limit(limit).Offset(offset).Find(&jobs)

	writeJSON(w, http.StatusOK, map[string]any{
		"jobs":  jobs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GET /api/jobs/:id
func (h *Handler) GetJob(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var job storage.Job
	if err := h.db.First(&job, "id = ?", id).Error; err != nil {
		writeErr(w, http.StatusNotFound, "job not found")
		return
	}

	var logs []storage.JobLog
	h.db.Where("job_id = ?", id).Order("created_at asc").Find(&logs)

	var retries []storage.RetryHistory
	h.db.Where("job_id = ?", id).Order("attempt_num asc").Find(&retries)

	var diagnostic *storage.JobDiagnostic
	h.db.Where("job_id = ?", id).First(&diagnostic)

	writeJSON(w, http.StatusOK, map[string]any{
		"job":        job,
		"logs":       logs,
		"retries":    retries,
		"diagnostic": diagnostic,
	})
}

// POST /api/jobs/:id/retry
func (h *Handler) RetryJob(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var job storage.Job
	if err := h.db.First(&job, "id = ?", id).Error; err != nil {
		writeErr(w, http.StatusNotFound, "job not found")
		return
	}
	if job.Status != storage.StatusFailed {
		writeErr(w, http.StatusBadRequest, "only failed jobs can be retried")
		return
	}

	job.Status = storage.StatusQueued
	job.RetryCount = 0
	job.ErrorMessage = ""
	job.WorkerID = ""
	job.StartedAt = nil
	job.CompletedAt = nil
	job.DurationMs = nil
	h.db.Save(&job)
	h.db.Where("job_id = ?", id).Delete(&storage.JobDiagnostic{})
	h.q.Enqueue(&job)

	slog.Info("job manually retried", "job_id", job.ID)
	writeJSON(w, http.StatusOK, job)
}

// DELETE /api/jobs/:id
func (h *Handler) DeleteJob(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	result := h.db.Delete(&storage.Job{}, "id = ?", id)
	if result.RowsAffected == 0 {
		writeErr(w, http.StatusNotFound, "job not found")
		return
	}
	h.db.Where("job_id = ?", id).Delete(&storage.JobLog{})
	h.db.Where("job_id = ?", id).Delete(&storage.RetryHistory{})
	h.db.Where("job_id = ?", id).Delete(&storage.JobDiagnostic{})

	writeJSON(w, http.StatusOK, map[string]string{"message": "job deleted"})
}

// POST /api/jobs/:id/diagnose
func (h *Handler) DiagnoseJob(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var job storage.Job
	if err := h.db.First(&job, "id = ?", id).Error; err != nil {
		writeErr(w, http.StatusNotFound, "job not found")
		return
	}

	var logs []storage.JobLog
	h.db.Where("job_id = ?", id).Find(&logs)

	diag, err := h.ai.Diagnose(&job, logs)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, fmt.Sprintf("diagnostic failed: %v", err))
		return
	}

	h.db.Where(storage.JobDiagnostic{JobID: id}).Assign(diag).FirstOrCreate(diag)
	writeJSON(w, http.StatusOK, diag)
}

// GET /api/stats
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	var stats struct {
		Total     int64 `json:"total"`
		Queued    int64 `json:"queued"`
		Running   int64 `json:"running"`
		Completed int64 `json:"completed"`
		Failed    int64 `json:"failed"`
		Scheduled int64 `json:"scheduled"`
	}
	h.db.Model(&storage.Job{}).Count(&stats.Total)
	h.db.Model(&storage.Job{}).Where("status = ?", storage.StatusQueued).Count(&stats.Queued)
	h.db.Model(&storage.Job{}).Where("status = ?", storage.StatusRunning).Count(&stats.Running)
	h.db.Model(&storage.Job{}).Where("status = ?", storage.StatusCompleted).Count(&stats.Completed)
	h.db.Model(&storage.Job{}).Where("status = ?", storage.StatusFailed).Count(&stats.Failed)
	h.db.Model(&storage.Job{}).Where("status = ?", storage.StatusScheduled).Count(&stats.Scheduled)

	writeJSON(w, http.StatusOK, map[string]any{
		"stats":          stats,
		"queue_depth":    h.q.Len(),
		"active_workers": h.pool.ActiveCount(),
	})
}

// GET /api/health
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	sqlDB, err := h.db.DB()
	dbStatus := "ok"
	if err != nil || sqlDB.Ping() != nil {
		dbStatus = "error"
	}
	groqStatus := "not_configured"
	if os.Getenv("GROQ_API_KEY") != "" {
		groqStatus = "configured"
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":      "ok",
		"database":    dbStatus,
		"groq":        groqStatus,
		"queue_depth": h.q.Len(),
	})
}

// POST /api/seed
func (h *Handler) SeedJobs(w http.ResponseWriter, r *http.Request) {
	seeds := []struct {
		t       storage.JobType
		payload any
	}{
		{storage.JobTypeCSV, map[string]any{"rows": 150, "source": "transactions_q4.csv"}},
		{storage.JobTypeCSV, map[string]any{"rows": 320, "source": "users_export.csv"}},
		{storage.JobTypeLogAnalysis, map[string]any{"source": "api-gateway", "log_content": "sample logs"}},
		{storage.JobTypeLogAnalysis, map[string]any{"source": "worker-service", "log_content": "panic: nil pointer"}},
		{storage.JobTypeMonitoring, map[string]any{"endpoint": "https://api.example.com/health"}},
		{storage.JobTypeMonitoring, map[string]any{"endpoint": "https://payments.internal/ping"}},
	}

	var created []storage.Job
	for _, s := range seeds {
		payloadBytes, _ := json.Marshal(s.payload)
		job := &storage.Job{
			Type:       s.t,
			Priority:   storage.PriorityNormal,
			Payload:    string(payloadBytes),
			MaxRetries: 3,
			Status:     storage.StatusQueued,
		}
		h.db.Create(job)
		h.q.Enqueue(job)
		created = append(created, *job)
	}

	writeJSON(w, http.StatusCreated, map[string]any{"created": len(created), "jobs": created})
}
