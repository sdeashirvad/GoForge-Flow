package jobs

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/flowforge/flowforge-go/internal/storage"
	"gorm.io/gorm"
)

type Executor struct {
	db         *gorm.DB
	httpClient *http.Client
}

func NewExecutor(db *gorm.DB) *Executor {
	return &Executor{
		db: db,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 5 {
					return fmt.Errorf("stopped after 5 redirects")
				}
				return nil
			},
		},
	}
}

func (e *Executor) Execute(ctx context.Context, job *storage.Job, workerID string) error {
	e.log(job.ID, "INFO", fmt.Sprintf("worker %s starting job type=%s", workerID, job.Type))

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

// ── CSV Processing ────────────────────────────────────────────────────────────

func (e *Executor) runCSVProcessing(ctx context.Context, job *storage.Job) error {
	var payload struct {
		Rows    int    `json:"rows"`
		Content string `json:"content"`
		Source  string `json:"source"`
	}
	json.Unmarshal([]byte(job.Payload), &payload)

	source := payload.Source
	if source == "" {
		source = "stdin"
	}

	var content string
	if payload.Content != "" {
		content = payload.Content
		e.log(job.ID, "INFO", fmt.Sprintf("received CSV content (%d bytes) from %s", len(content), source))
	} else {
		rows := payload.Rows
		if rows <= 0 {
			rows = 100
		}
		content = generateSampleCSV(rows)
		e.log(job.ID, "INFO", fmt.Sprintf("no CSV content provided — generating %d-row sample for source=%s", rows, source))
	}

	reader := csv.NewReader(strings.NewReader(content))
	records, err := reader.ReadAll()
	if err != nil {
		return fmt.Errorf("CSV parse error: %w", err)
	}

	if len(records) < 2 {
		return fmt.Errorf("CSV has no data rows (only header or empty)")
	}

	headers := records[0]
	dataRows := records[1:]
	e.log(job.ID, "INFO", fmt.Sprintf("parsed CSV: %d columns %v, %d data rows", len(headers), headers, len(dataRows)))
	e.log(job.ID, "INFO", fmt.Sprintf("starting concurrent validation with 8 workers"))

	type rowResult struct {
		row int
		err error
	}

	results := make(chan rowResult, len(dataRows))
	sem := make(chan struct{}, 8)
	var wg sync.WaitGroup

	for i, record := range dataRows {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		wg.Add(1)
		go func(rowNum int, r []string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if err := validateRow(r, len(headers)); err != nil {
				results <- rowResult{rowNum, err}
				return
			}
			results <- rowResult{rowNum, nil}
		}(i+1, record)
	}

	wg.Wait()
	close(results)

	var errCount, validCount int
	for res := range results {
		if res.err != nil {
			errCount++
			if errCount <= 5 {
				e.log(job.ID, "WARN", fmt.Sprintf("row %d validation failed: %v", res.row, res.err))
			}
		} else {
			validCount++
		}
	}

	passRate := float64(validCount) / float64(len(dataRows)) * 100
	e.log(job.ID, "INFO", fmt.Sprintf("validation complete: %d valid, %d invalid rows (%.1f%% pass rate)", validCount, errCount, passRate))

	if passRate < 50 {
		return fmt.Errorf("too many invalid rows: %.1f%% pass rate — expected ≥50%%", passRate)
	}

	e.log(job.ID, "INFO", fmt.Sprintf("CSV processing complete for %s", source))
	return nil
}

// ── Log Analysis ──────────────────────────────────────────────────────────────

func (e *Executor) runLogAnalysis(ctx context.Context, job *storage.Job) error {
	var payload struct {
		LogContent string `json:"log_content"`
		Source     string `json:"source"`
	}
	json.Unmarshal([]byte(job.Payload), &payload)

	source := payload.Source
	if source == "" {
		source = "unknown"
	}
	e.log(job.ID, "INFO", fmt.Sprintf("ingesting logs from source: %s", source))

	content := payload.LogContent
	if content == "" {
		return fmt.Errorf("no log_content provided in payload")
	}

	if ctx.Err() != nil {
		return ctx.Err()
	}

	lines := strings.Split(content, "\n")
	e.log(job.ID, "INFO", fmt.Sprintf("scanning %d log lines", len(lines)))

	counts := map[string]int{
		"ERROR": 0, "WARN": 0, "INFO": 0, "DEBUG": 0, "FATAL": 0,
	}
	var errorLines []string
	var stackTraceLines []string
	inStack := false

	for _, line := range lines {
		upper := strings.ToUpper(line)
		switch {
		case strings.Contains(upper, "FATAL") || strings.Contains(upper, "PANIC"):
			counts["FATAL"]++
			errorLines = append(errorLines, line)
			inStack = true
		case strings.Contains(upper, "ERROR"):
			counts["ERROR"]++
			errorLines = append(errorLines, line)
			inStack = false
		case strings.Contains(upper, "WARN") || strings.Contains(upper, "WARNING"):
			counts["WARN"]++
			inStack = false
		case strings.Contains(upper, "DEBUG"):
			counts["DEBUG"]++
			inStack = false
		case strings.Contains(upper, "INFO"):
			counts["INFO"]++
			inStack = false
		case inStack && (strings.HasPrefix(strings.TrimSpace(line), "at ") ||
			strings.HasPrefix(strings.TrimSpace(line), "goroutine ") ||
			strings.Contains(line, ".go:")):
			stackTraceLines = append(stackTraceLines, strings.TrimSpace(line))
		}
	}

	if ctx.Err() != nil {
		return ctx.Err()
	}

	e.log(job.ID, "INFO", fmt.Sprintf("level breakdown — FATAL:%d ERROR:%d WARN:%d INFO:%d DEBUG:%d",
		counts["FATAL"], counts["ERROR"], counts["WARN"], counts["INFO"], counts["DEBUG"]))

	if len(errorLines) > 0 {
		for i, el := range errorLines {
			if i >= 3 {
				e.log(job.ID, "WARN", fmt.Sprintf("... and %d more error/fatal lines", len(errorLines)-3))
				break
			}
			e.log(job.ID, "ERROR", fmt.Sprintf("found: %s", strings.TrimSpace(el)))
		}
	}

	if len(stackTraceLines) > 0 {
		e.log(job.ID, "WARN", fmt.Sprintf("stack trace detected: %d frames captured", len(stackTraceLines)))
		for i, frame := range stackTraceLines {
			if i >= 4 {
				break
			}
			e.log(job.ID, "DEBUG", fmt.Sprintf("  frame: %s", frame))
		}
	}

	// Pattern detection
	patterns := detectPatterns(content)
	for _, p := range patterns {
		e.log(job.ID, "WARN", fmt.Sprintf("pattern detected: %s", p))
	}

	if counts["ERROR"]+counts["FATAL"] == 0 {
		e.log(job.ID, "INFO", "no errors or fatals found — log stream appears healthy")
	} else {
		e.log(job.ID, "WARN", fmt.Sprintf("found %d error-level entries requiring attention", counts["ERROR"]+counts["FATAL"]))
	}

	e.log(job.ID, "INFO", "log analysis complete")
	return nil
}

func detectPatterns(content string) []string {
	lower := strings.ToLower(content)
	var found []string
	checks := map[string]string{
		"nil pointer dereference":    "nil pointer dereference",
		"connection refused":         "connection refused",
		"context deadline exceeded":  "context deadline exceeded",
		"out of memory":              "OOM / out-of-memory condition",
		"too many open files":        "file descriptor exhaustion",
		"connection pool exhausted":  "connection pool exhaustion",
		"deadlock":                   "potential deadlock",
		"timeout":                    "timeout pattern",
		"panic:":                     "runtime panic",
		"certificate":                "TLS/certificate issue",
		"permission denied":          "permission denied",
	}
	for needle, label := range checks {
		if strings.Contains(lower, needle) {
			found = append(found, label)
		}
	}
	return found
}

// ── Monitoring ────────────────────────────────────────────────────────────────

func (e *Executor) runMonitoring(ctx context.Context, job *storage.Job) error {
	var payload struct {
		Endpoint       string   `json:"endpoint"`
		TimeoutMs      int      `json:"timeout_ms"`
		ExpectedStatus int      `json:"expected_status"`
		ExpectedBody   string   `json:"expected_body"`
		Headers        map[string]string `json:"headers"`
	}
	json.Unmarshal([]byte(job.Payload), &payload)

	endpoint := payload.Endpoint
	if endpoint == "" {
		return fmt.Errorf("no endpoint provided in payload")
	}

	timeoutMs := payload.TimeoutMs
	if timeoutMs <= 0 {
		timeoutMs = 10000
	}
	expectedStatus := payload.ExpectedStatus
	if expectedStatus == 0 {
		expectedStatus = 200
	}

	e.log(job.ID, "INFO", fmt.Sprintf("probing %s (timeout=%dms, expected_status=%d)", endpoint, timeoutMs, expectedStatus))

	reqCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, endpoint, nil)
	if err != nil {
		return fmt.Errorf("invalid endpoint URL %q: %w", endpoint, err)
	}

	req.Header.Set("User-Agent", "FlowForge-Monitor/1.0")
	for k, v := range payload.Headers {
		req.Header.Set(k, v)
	}

	start := time.Now()
	resp, err := e.httpClient.Do(req)
	latency := time.Since(start)

	if err != nil {
		// Distinguish different failure modes for useful diagnostics
		errStr := err.Error()
		switch {
		case strings.Contains(errStr, "no such host") || strings.Contains(errStr, "name resolution") || strings.Contains(errStr, "lookup"):
			return fmt.Errorf("DNS resolution failed for %q: %w", endpoint, err)
		case strings.Contains(errStr, "connection refused"):
			return fmt.Errorf("connection refused at %q — service may be down", endpoint)
		case strings.Contains(errStr, "context deadline exceeded") || strings.Contains(errStr, "timeout"):
			return fmt.Errorf("request timed out after %dms: %w", timeoutMs, err)
		case strings.Contains(errStr, "certificate") || strings.Contains(errStr, "tls") || strings.Contains(errStr, "x509"):
			return fmt.Errorf("TLS/certificate error for %q: %w", endpoint, err)
		case strings.Contains(errStr, "stopped after 5 redirects"):
			return fmt.Errorf("too many redirects for %q", endpoint)
		default:
			return fmt.Errorf("HTTP request failed for %q: %w", endpoint, err)
		}
	}
	defer resp.Body.Close()

	e.log(job.ID, "INFO", fmt.Sprintf("got HTTP %d in %dms", resp.StatusCode, latency.Milliseconds()))
	e.log(job.ID, "DEBUG", fmt.Sprintf("response headers: Content-Type=%s, Content-Length=%s",
		resp.Header.Get("Content-Type"), resp.Header.Get("Content-Length")))

	// Read body (up to 4KB) for content matching
	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	body := string(bodyBytes)

	if resp.StatusCode != expectedStatus {
		snippet := body
		if len(snippet) > 200 {
			snippet = snippet[:200] + "..."
		}
		return fmt.Errorf("unexpected HTTP %d (expected %d) — body: %s", resp.StatusCode, expectedStatus, snippet)
	}

	if payload.ExpectedBody != "" {
		if !strings.Contains(body, payload.ExpectedBody) {
			return fmt.Errorf("response body does not contain expected string %q", payload.ExpectedBody)
		}
		e.log(job.ID, "INFO", fmt.Sprintf("body match confirmed for %q", payload.ExpectedBody))
	}

	e.log(job.ID, "INFO", fmt.Sprintf("health check PASSED: %s responded HTTP %d in %dms", endpoint, resp.StatusCode, latency.Milliseconds()))
	return nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (e *Executor) log(jobID, level, msg string) {
	slog.Info("job_log", "job_id", jobID, "level", level, "msg", msg)
	e.db.Create(&storage.JobLog{
		JobID:   jobID,
		Level:   level,
		Message: msg,
	})
}

func validateRow(row []string, expectedCols int) error {
	if len(row) != expectedCols {
		return fmt.Errorf("column count mismatch: got %d, expected %d", len(row), expectedCols)
	}
	if len(row) > 0 && strings.TrimSpace(row[0]) == "" {
		return fmt.Errorf("empty primary key in column 0")
	}
	return nil
}

func generateSampleCSV(rows int) string {
	var b strings.Builder
	b.WriteString("id,name,email,amount,currency,status,created_at\n")
	statuses := []string{"pending", "settled", "failed", "refunded"}
	for i := 1; i <= rows; i++ {
		status := statuses[i%len(statuses)]
		b.WriteString(fmt.Sprintf("%d,user_%04d,user%d@example.com,%.2f,USD,%s,%s\n",
			i, i, i,
			float64(i%500)+0.99,
			status,
			time.Now().Add(-time.Duration(i)*time.Minute).Format(time.RFC3339),
		))
	}
	return b.String()
}
