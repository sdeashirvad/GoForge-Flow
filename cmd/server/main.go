package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/flowforge/flowforge-go/internal/api"
	"github.com/flowforge/flowforge-go/internal/queue"
	"github.com/flowforge/flowforge-go/internal/scheduler"
	"github.com/flowforge/flowforge-go/internal/storage"
	"github.com/flowforge/flowforge-go/internal/workers"
)

func main() {
	godotenv.Load()

	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	slog.Info("FlowForge Go starting")

	db, err := storage.NewDB()
	if err != nil {
		slog.Error("database init failed", "error", err)
		os.Exit(1)
	}

	q := queue.NewInMemoryQueue(512)

	pool := workers.NewPool(5, q, db)

	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "./web/dist"
	}
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		staticDir = ""
	}

	router := api.NewRouter(db, q, pool, staticDir)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         "0.0.0.0:" + port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go pool.Start(ctx)

	sched := scheduler.New(db, q)
	go sched.Run(ctx)

	go func() {
		slog.Info("HTTP server listening", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("HTTP shutdown error", "error", err)
	}

	q.Close()
	slog.Info("FlowForge Go stopped cleanly")
}
