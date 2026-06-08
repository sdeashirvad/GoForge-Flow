package api

import (
        "net/http"
        "os"

        "github.com/go-chi/chi/v5"
        chiMiddleware "github.com/go-chi/chi/v5/middleware"
        "github.com/go-chi/cors"
        "github.com/flowforge/flowforge-go/internal/middleware"
        "github.com/flowforge/flowforge-go/internal/queue"
        "github.com/flowforge/flowforge-go/internal/workers"
        "github.com/flowforge/flowforge-go/internal/ws"
        "gorm.io/gorm"
)

func NewRouter(db *gorm.DB, q queue.JobQueue, pool *workers.Pool, hub *ws.Hub, staticDir string) http.Handler {
        r := chi.NewRouter()

        r.Use(chiMiddleware.Recoverer)
        r.Use(middleware.RequestID)
        r.Use(middleware.StructuredLogger)
        r.Use(cors.Handler(cors.Options{
                AllowedOrigins:   []string{"*"},
                AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
                AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
                ExposedHeaders:   []string{"X-Request-ID"},
                AllowCredentials: false,
                MaxAge:           300,
        }))

        h := NewHandler(db, q, pool, hub)

        r.Route("/api", func(r chi.Router) {
                r.Get("/health", h.Health)
                r.Get("/stats", h.GetStats)
                r.Post("/seed", h.SeedJobs)

                r.Post("/jobs", h.CreateJob)
                r.Get("/jobs", h.ListJobs)
                r.Get("/jobs/{id}", h.GetJob)
                r.Post("/jobs/{id}/retry", h.RetryJob)
                r.Delete("/jobs/{id}", h.DeleteJob)
                r.Post("/jobs/{id}/diagnose", h.DiagnoseJob)

                r.Get("/events", hub.ServeSSE)
        })

        // Serve static frontend
        if staticDir != "" {
                if _, err := os.Stat(staticDir); err == nil {
                        fs := http.FileServer(http.Dir(staticDir))
                        r.Handle("/assets/*", fs)
                        r.Handle("/favicon.ico", fs)
                        r.NotFound(func(w http.ResponseWriter, r *http.Request) {
                                http.ServeFile(w, r, staticDir+"/index.html")
                        })
                }
        } else {
                r.Get("/", func(w http.ResponseWriter, r *http.Request) {
                        writeJSON(w, http.StatusOK, map[string]string{
                                "service": "FlowForge Go",
                                "version": "1.0.0",
                                "docs":    "/api/health",
                        })
                })
        }

        return r
}
