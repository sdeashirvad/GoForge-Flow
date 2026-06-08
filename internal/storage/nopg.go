//go:build !postgres

package storage

import (
	"fmt"
	"log/slog"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// openPostgres falls back to SQLite when the postgres build tag is absent.
// This lets developers run locally without the PostgreSQL driver.
func openPostgres(dsn string, cfg *gorm.Config) (*gorm.DB, error) {
	slog.Warn("postgres build tag not set — falling back to SQLite despite DATABASE_URL being set",
		"hint", "build with -tags postgres for PostgreSQL support")
	_ = dsn
	db, err := gorm.Open(sqlite.Open("flowforge.db"), cfg)
	if err != nil {
		return nil, fmt.Errorf("SQLite fallback failed: %w", err)
	}
	return db, nil
}
