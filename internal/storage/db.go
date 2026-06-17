package storage

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/glebarez/sqlite"
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
		db, err = openPostgres(normalizePostgresURL(dbURL), cfg)
		if err != nil {
			return nil, fmt.Errorf("failed to connect to PostgreSQL: %w", err)
		}
		slog.Info("connected to PostgreSQL")
	} else {
		path := sqlitePath()
		slog.Info("DATABASE_URL not set — using SQLite", "path", path)
		db, err = gorm.Open(sqlite.Open(path), cfg)
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

func sqlitePath() string {
	if p := os.Getenv("SQLITE_PATH"); p != "" {
		return p
	}
	return "flowforge.db"
}

// normalizePostgresURL ensures sslmode is set for managed hosts (e.g. Railway).
func normalizePostgresURL(url string) string {
	if strings.Contains(url, "sslmode=") {
		return url
	}
	sep := "?"
	if strings.Contains(url, "?") {
		sep = "&"
	}
	return url + sep + "sslmode=require"
}

func runMigrations(db *gorm.DB) error {
	return db.AutoMigrate(
		&Job{},
		&JobLog{},
		&JobDiagnostic{},
		&RetryHistory{},
	)
}
