package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/flowforge/flowforge-go/internal/storage"
)

type DiagnosticsEngine interface {
	Diagnose(job *storage.Job, logs []storage.JobLog) (*storage.JobDiagnostic, error)
}

type MockDiagnosticsEngine struct{}

var csvErrors = []string{
	"Likely schema mismatch near column 'transaction_amount' — expected float64, got string.",
	"Row 47 contains malformed UTF-8 sequence. Encoding may be ISO-8859-1 instead of UTF-8.",
	"Header row missing required field 'customer_id'. Pipeline cannot proceed.",
	"Duplicate primary key detected at row 312. Upsert strategy not configured.",
	"Column count mismatch: expected 8 columns, got 6 in rows 200–250.",
}

var logErrors = []string{
	"Nil pointer dereference likely caused by uninitialized dependency injection. Check service wiring.",
	"Connection pool exhausted — max_connections=10 may be too low for current concurrency.",
	"Goroutine leak detected: select statement missing default/timeout case.",
	"OOM kill likely due to unbounded slice growth in batch accumulator.",
	"Deadlock pattern: two goroutines waiting on each other's mutex.",
}

var monitoringErrors = []string{
	"Target endpoint returned 503 — upstream service may be overloaded or deploying.",
	"DNS resolution failure for target host. Check VPN/network egress rules.",
	"TLS certificate expired or hostname mismatch on target.",
	"TCP connection timeout after 30s — firewall rule may be blocking egress.",
	"Response body did not match expected health check pattern.",
}

func (m *MockDiagnosticsEngine) Diagnose(job *storage.Job, logs []storage.JobLog) (*storage.JobDiagnostic, error) {
	slog.Info("generating mock AI diagnostic", "job_id", job.ID, "type", job.Type)

	var pool []string
	switch job.Type {
	case storage.JobTypeCSV:
		pool = csvErrors
	case storage.JobTypeLogAnalysis:
		pool = logErrors
	case storage.JobTypeMonitoring:
		pool = monitoringErrors
	default:
		pool = logErrors
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	summary := pool[r.Intn(len(pool))]

	return &storage.JobDiagnostic{
		JobID:       job.ID,
		Summary:     summary,
		RootCause:   fmt.Sprintf("Job failed after %d attempt(s). %s", job.RetryCount+1, extractRootCause(job, logs)),
		Suggestions: buildSuggestions(job),
		ModelUsed:   "mock-diagnostic-v1 (set GROQ_API_KEY for LLM-powered diagnostics)",
	}, nil
}

func extractRootCause(job *storage.Job, logs []storage.JobLog) string {
	if job.ErrorMessage != "" {
		return "Last error: " + job.ErrorMessage
	}
	for i := len(logs) - 1; i >= 0; i-- {
		if logs[i].Level == "ERROR" {
			return "Last error log: " + logs[i].Message
		}
	}
	return "No explicit error captured."
}

func buildSuggestions(job *storage.Job) string {
	tips := []string{
		"Inspect the execution logs for the first ERROR-level entry.",
		"Verify payload structure matches expected schema.",
	}
	if job.RetryCount >= job.MaxRetries {
		tips = append(tips, "Max retries reached — consider increasing max_retries or fixing root cause before requeueing.")
	}
	return strings.Join(tips, " | ")
}

// GroqDiagnosticsEngine uses the Groq API (llama3-8b-8192) for real diagnostics.
type GroqDiagnosticsEngine struct {
	apiKey string
	client *http.Client
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqRequest struct {
	Model    string        `json:"model"`
	Messages []groqMessage `json:"messages"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func NewGroqEngine() *GroqDiagnosticsEngine {
	return &GroqDiagnosticsEngine{
		apiKey: os.Getenv("GROQ_API_KEY"),
		client: &http.Client{Timeout: 20 * time.Second},
	}
}

func (g *GroqDiagnosticsEngine) Available() bool {
	return g.apiKey != ""
}

func (g *GroqDiagnosticsEngine) Diagnose(job *storage.Job, logs []storage.JobLog) (*storage.JobDiagnostic, error) {
	if !g.Available() {
		mock := &MockDiagnosticsEngine{}
		return mock.Diagnose(job, logs)
	}

	var logLines strings.Builder
	for _, l := range logs {
		logLines.WriteString(fmt.Sprintf("[%s] %s\n", l.Level, l.Message))
	}

	prompt := fmt.Sprintf(`You are a backend systems diagnostic AI. A job failed in production.

Job ID: %s
Job Type: %s
Error: %s
Retry Count: %d / %d
Payload (truncated): %.500s

Execution Logs:
%s

Provide a concise JSON response with fields:
- summary: one sentence describing what likely went wrong
- root_cause: technical explanation (2-3 sentences)
- suggestions: pipe-separated actionable fixes

Respond ONLY with valid JSON, no markdown.`,
		job.ID, job.Type, job.ErrorMessage, job.RetryCount, job.MaxRetries,
		job.Payload, logLines.String())

	body, _ := json.Marshal(groqRequest{
		Model: "llama3-8b-8192",
		Messages: []groqMessage{
			{Role: "user", Content: prompt},
		},
	})

	req, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+g.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("groq request failed: %w", err)
	}
	defer resp.Body.Close()

	var gr groqResponse
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, err
	}
	if gr.Error != nil {
		return nil, fmt.Errorf("groq error: %s", gr.Error.Message)
	}
	if len(gr.Choices) == 0 {
		return nil, fmt.Errorf("no choices in groq response")
	}

	content := gr.Choices[0].Message.Content
	var parsed struct {
		Summary     string `json:"summary"`
		RootCause   string `json:"root_cause"`
		Suggestions string `json:"suggestions"`
	}
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		parsed.Summary = content
		parsed.RootCause = "Parsed from raw LLM output."
		parsed.Suggestions = "Review logs manually."
	}

	return &storage.JobDiagnostic{
		JobID:       job.ID,
		Summary:     parsed.Summary,
		RootCause:   parsed.RootCause,
		Suggestions: parsed.Suggestions,
		ModelUsed:   "groq/llama3-8b-8192",
	}, nil
}
