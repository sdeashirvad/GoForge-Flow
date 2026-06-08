package jobs

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"
	"strings"
	"sync"
	"time"

	"github.com/flowforge/flowforge-go/internal/storage"
	"gorm.io/gorm"
)

// Executor runs a job and writes logs to the DB.
type Executor struct {
	db *gorm.DB
}

func NewExecutor(db *gorm.DB) *Executor {
	return &Executor{db: db}
}

func (e *Executor) Execute(ctx context.Context, job *storage.Job, workerID string) error {
	e.log(job.ID, "INFO", fmt.Sprintf("worker %s starting execution of job type=%s", workerID, job.Type))

	switch job.Type {
	case storage.JobTypeCSV:
		return e.runCSVProcessing(ctx, job)
	case storage.JobTypeLogAnalysis:
		return e.runLogAnalysis(ctx, job)
	case storage.JobTypeMonitoring:
		return e.runMonitoring(ctx, job)
	default:
		return fmt.Errorf("unknown job type: %s", job.Type)
	}
}

// runCSVProcessing simulates concurrent CSV row validation.
func (e *Executor) runCSVProcessing(ctx context.Context, job *storage.Job) error {
	var payload struct {
		Rows    int    `json:"rows"`
		Content string `json:"content"`
	}
	json.Unmarshal([]byte(job.Payload), &payload)

	rows := payload.Rows
	if rows == 0 {
		rows = 50 + rand.Intn(200)
	}

	e.log(job.ID, "INFO", fmt.Sprintf("parsing CSV with %d rows", rows))

	// Simulate CSV parsing with concurrent row validation
	type result struct {
		row int
		err error
	}

	var content string
	if payload.Content != "" {
		content = payload.Content
	} else {
		content = generateSampleCSV(rows)
	}

	reader := csv.NewReader(strings.NewReader(content))
	records, err := reader.ReadAll()
	if err != nil {
		return fmt.Errorf("CSV parse error: %w", err)
	}

	e.log(job.ID, "INFO", fmt.Sprintf("validating %d rows concurrently", len(records)-1))

	results := make(chan result, len(records))
	sem := make(chan struct{}, 8)
	var wg sync.WaitGroup

	for i, record := range records[1:] {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		wg.Add(1)
		go func(rowNum int, r []string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			time.Sleep(time.Duration(5+rand.Intn(15)) * time.Millisecond)

			if err := validateRow(r); err != nil {
				results <- result{rowNum, err}
				return
			}
			results <- result{rowNum, nil}
		}(i+1, record)
	}

	wg.Wait()
	close(results)

	errCount := 0
	validCount := 0
	for res := range results {
		if res.err != nil {
			errCount++
			if errCount <= 3 {
				e.log(job.ID, "WARN", fmt.Sprintf("row %d validation failed: %v", res.row, res.err))
			}
		} else {
			validCount++
		}
	}

	// Simulate occasional job failure for demo purposes
	if rand.Float32() < 0.15 {
		return fmt.Errorf("schema validation failed: %d rows rejected out of %d", errCount+rand.Intn(5)+1, len(records)-1)
	}

	e.log(job.ID, "INFO", fmt.Sprintf("CSV processing complete: %d valid, %d invalid rows", validCount, errCount))
	e.log(job.ID, "INFO", fmt.Sprintf("summary: processed %d rows, %.1f%% pass rate", len(records)-1, float64(validCount)/float64(len(records)-1)*100))
	return nil
}

// runLogAnalysis simulates log categorization.
func (e *Executor) runLogAnalysis(ctx context.Context, job *storage.Job) error {
	var payload struct {
		LogContent string `json:"log_content"`
		Source     string `json:"source"`
	}
	json.Unmarshal([]byte(job.Payload), &payload)

	source := payload.Source
	if source == "" {
		source = "application"
	}
	e.log(job.ID, "INFO", fmt.Sprintf("analyzing logs from source: %s", source))

	time.Sleep(time.Duration(200+rand.Intn(400)) * time.Millisecond)

	if ctx.Err() != nil {
		return ctx.Err()
	}

	categories := map[string]int{
		"ERROR":   rand.Intn(15),
		"WARN":    rand.Intn(40),
		"INFO":    rand.Intn(200),
		"DEBUG":   rand.Intn(100),
	}

	for level, count := range categories {
		e.log(job.ID, "INFO", fmt.Sprintf("found %d %s-level entries", count, level))
	}

	if rand.Float32() < 0.12 {
		return fmt.Errorf("log stream malformed: unexpected EOF at byte offset %d", rand.Intn(50000))
	}

	rootCauses := []string{
		"goroutine panic in request handler",
		"database connection pool exhausted",
		"nil pointer dereference in middleware chain",
		"context deadline exceeded during RPC call",
	}
	e.log(job.ID, "INFO", fmt.Sprintf("probable root cause identified: %s", rootCauses[rand.Intn(len(rootCauses))]))
	e.log(job.ID, "INFO", "log analysis complete")
	return nil
}

// runMonitoring simulates an endpoint health check.
func (e *Executor) runMonitoring(ctx context.Context, job *storage.Job) error {
	var payload struct {
		Endpoint string `json:"endpoint"`
		Timeout  int    `json:"timeout_ms"`
	}
	json.Unmarshal([]byte(job.Payload), &payload)

	endpoint := payload.Endpoint
	if endpoint == "" {
		endpoints := []string{
			"https://api.example.com/health",
			"https://payments.internal/ping",
			"https://auth-service/ready",
			"https://data-pipeline.svc/status",
		}
		endpoint = endpoints[rand.Intn(len(endpoints))]
	}

	e.log(job.ID, "INFO", fmt.Sprintf("probing endpoint: %s", endpoint))

	time.Sleep(time.Duration(100+rand.Intn(500)) * time.Millisecond)

	if ctx.Err() != nil {
		return ctx.Err()
	}

	if rand.Float32() < 0.18 {
		codes := []int{503, 504, 502, 429}
		code := codes[rand.Intn(len(codes))]
		return fmt.Errorf("endpoint returned HTTP %d: service unavailable", code)
	}

	latency := 50 + rand.Intn(450)
	e.log(job.ID, "INFO", fmt.Sprintf("endpoint responded in %dms", latency))
	e.log(job.ID, "INFO", "health check passed: HTTP 200 OK")
	return nil
}

func (e *Executor) log(jobID, level, msg string) {
	slog.Info("job_log", "job_id", jobID, "level", level, "msg", msg)
	e.db.Create(&storage.JobLog{
		JobID:   jobID,
		Level:   level,
		Message: msg,
	})
}

func validateRow(row []string) error {
	if len(row) < 3 {
		return fmt.Errorf("insufficient columns")
	}
	if row[0] == "" {
		return fmt.Errorf("empty primary key")
	}
	return nil
}

func generateSampleCSV(rows int) string {
	var b strings.Builder
	b.WriteString("id,name,amount,currency,timestamp\n")
	for i := 1; i <= rows; i++ {
		b.WriteString(fmt.Sprintf("%d,user_%d,%.2f,USD,%s\n",
			i, rand.Intn(1000), rand.Float64()*1000,
			time.Now().Add(-time.Duration(rand.Intn(3600))*time.Second).Format(time.RFC3339),
		))
	}
	return b.String()
}
