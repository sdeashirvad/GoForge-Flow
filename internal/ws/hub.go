// Package ws provides a Server-Sent Events (SSE) hub for real-time job updates.
// SSE works through all HTTP proxies (including Vite's dev proxy) unlike WebSockets.
package ws

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"
)

type Event struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type client struct {
	id   uint64
	send chan string
}

type Hub struct {
	mu      sync.RWMutex
	clients map[uint64]*client
	nextID  atomic.Uint64
}

func NewHub() *Hub {
	return &Hub{clients: make(map[uint64]*client)}
}

func (h *Hub) Broadcast(eventType string, payload any) {
	data, err := json.Marshal(Event{Type: eventType, Payload: payload})
	if err != nil {
		return
	}
	msg := fmt.Sprintf("data: %s\n\n", data)

	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, c := range h.clients {
		select {
		case c.send <- msg:
		default:
			// drop if slow consumer
		}
	}
}

// ServeSSE handles the GET /api/events SSE endpoint.
func (h *Hub) ServeSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	flusher, ok := w.(http.Flusher)
	if !ok {
		slog.Warn("SSE: response writer does not support flushing")
		return
	}

	id := h.nextID.Add(1)
	c := &client{id: id, send: make(chan string, 32)}

	h.mu.Lock()
	h.clients[id] = c
	h.mu.Unlock()

	slog.Info("SSE client connected", "id", id)

	// Send a heartbeat comment immediately so the browser knows it's connected
	fmt.Fprintf(w, ": connected\n\n")
	flusher.Flush()

	defer func() {
		h.mu.Lock()
		delete(h.clients, id)
		h.mu.Unlock()
		slog.Info("SSE client disconnected", "id", id)
	}()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			fmt.Fprint(w, msg)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}
