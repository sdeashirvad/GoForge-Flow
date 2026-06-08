package storage

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type JobStatus string
type JobPriority string
type JobType string

const (
	StatusQueued    JobStatus = "queued"
	StatusRunning   JobStatus = "running"
	StatusCompleted JobStatus = "completed"
	StatusFailed    JobStatus = "failed"
	StatusScheduled JobStatus = "scheduled"

	PriorityLow    JobPriority = "low"
	PriorityNormal JobPriority = "normal"
	PriorityHigh   JobPriority = "high"

	JobTypeCSV        JobType = "csv_processing"
	JobTypeLogAnalysis JobType = "log_analysis"
	JobTypeMonitoring  JobType = "monitoring"
)

type Job struct {
	ID            string      `json:"id" gorm:"primaryKey;type:text"`
	Type          JobType     `json:"type" gorm:"type:text;not null"`
	Status        JobStatus   `json:"status" gorm:"type:text;default:'queued'"`
	Priority      JobPriority `json:"priority" gorm:"type:text;default:'normal'"`
	Payload       string      `json:"payload" gorm:"type:text"`
	MaxRetries    int         `json:"max_retries" gorm:"default:3"`
	RetryCount    int         `json:"retry_count" gorm:"default:0"`
	ScheduledAt   *time.Time  `json:"scheduled_at,omitempty"`
	StartedAt     *time.Time  `json:"started_at,omitempty"`
	CompletedAt   *time.Time  `json:"completed_at,omitempty"`
	DurationMs    *int64      `json:"duration_ms,omitempty"`
	WorkerID      string      `json:"worker_id,omitempty" gorm:"type:text"`
	ErrorMessage  string      `json:"error_message,omitempty" gorm:"type:text"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

func (j *Job) BeforeCreate(tx *gorm.DB) error {
	if j.ID == "" {
		j.ID = uuid.New().String()
	}
	return nil
}

type JobLog struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	JobID     string    `json:"job_id" gorm:"type:text;not null;index"`
	Level     string    `json:"level" gorm:"type:text"`
	Message   string    `json:"message" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
}

type JobDiagnostic struct {
	ID          uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	JobID       string    `json:"job_id" gorm:"type:text;not null;uniqueIndex"`
	Summary     string    `json:"summary" gorm:"type:text"`
	RootCause   string    `json:"root_cause" gorm:"type:text"`
	Suggestions string    `json:"suggestions" gorm:"type:text"`
	ModelUsed   string    `json:"model_used" gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at"`
}

type RetryHistory struct {
	ID          uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	JobID       string    `json:"job_id" gorm:"type:text;not null;index"`
	AttemptNum  int       `json:"attempt_num"`
	StartedAt   time.Time `json:"started_at"`
	FailedAt    time.Time `json:"failed_at"`
	ErrorMsg    string    `json:"error_msg" gorm:"type:text"`
	BackoffSecs int       `json:"backoff_secs"`
}
