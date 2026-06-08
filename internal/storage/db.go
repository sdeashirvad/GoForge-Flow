package storage

import (
	"fmt"
	"log/slog"
	"os"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewDB() (*gorm.DB, error) {
	dbURL := os.Getenv("DATABASE_URL")

	var db *gorm.DB
	var err error

	cfg := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	if dbURL != "" {
		db, err = openPostgres(dbURL, cfg)
		if err != nil {
			return nil, fmt.Errorf("failed to connect to PostgreSQL: %w", err)
		}
		slog.Info("connected to PostgreSQL")
	} else {
		slog.Info("DATABASE_URL not set — using SQLite (flowforge.db)")
		db, err = gorm.Open(sqlite.Open("flowforge.db"), cfg)
		if err != nil {
			return nil, fmt.Errorf("failed to open SQLite: %w", err)
		}
	}

	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	slog.Info("database ready")
	return db, nil
}

func runMigrations(db *gorm.DB) error {
	return db.AutoMigrate(
		&Job{},
		&JobLog{},
		&JobDiagnostic{},
		&RetryHistory{},
	)
}
