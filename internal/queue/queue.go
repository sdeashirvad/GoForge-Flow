package queue

import (
	"context"
	"sync"

	"github.com/flowforge/flowforge-go/internal/storage"
)

// JobQueue is the abstraction over our in-process queue.
type JobQueue interface {
	Enqueue(job *storage.Job) error
	Dequeue(ctx context.Context) (*storage.Job, error)
	Len() int
	Close()
}

// InMemoryQueue is a goroutine-safe in-process queue backed by a buffered channel.
type InMemoryQueue struct {
	ch     chan *storage.Job
	mu     sync.Mutex
	length int
	closed bool
}

func NewInMemoryQueue(capacity int) *InMemoryQueue {
	return &InMemoryQueue{
		ch: make(chan *storage.Job, capacity),
	}
}

func (q *InMemoryQueue) Enqueue(job *storage.Job) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.closed {
		return nil
	}
	q.ch <- job
	q.length++
	return nil
}

// Dequeue blocks until a job is available or context is cancelled.
func (q *InMemoryQueue) Dequeue(ctx context.Context) (*storage.Job, error) {
	select {
	case job, ok := <-q.ch:
		if !ok {
			return nil, nil
		}
		q.mu.Lock()
		q.length--
		q.mu.Unlock()
		return job, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (q *InMemoryQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.length
}

func (q *InMemoryQueue) Close() {
	q.mu.Lock()
	defer q.mu.Unlock()
	if !q.closed {
		q.closed = true
		close(q.ch)
	}
}
