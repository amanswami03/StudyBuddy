package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Init() {
	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_SSLMODE"))
	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("Database not reachable:", err)
	}
	fmt.Println("✅ Connected to DB")

	// Run migrations
	runMigrations()
}

func runMigrations() {
	// List of migration files in order
	migrations := []string{
		"migrates.sql",
		"migrations_groups_create.sql",
		"migrate_messages.sql",
		"migrate_groups.sql",
		"migrate_groups_v2.sql",
		"migrate_join_requests.sql",
		"migrate_study_sessions.sql",
		"migrate_scheduled_group_sessions.sql",
		"migrate_points.sql",
		"migrate_resources.sql",
		"migrate_notifications.sql",
		"migrate_bio.sql",
		"migrate_user_fields.sql",
		"migrate_privacy_settings.sql",
	}

	// Get the correct migration path
	migrationsPath := filepath.Join("internal", "db")

	for _, migration := range migrations {
		filePath := filepath.Join(migrationsPath, migration)
		content, err := os.ReadFile(filePath)
		if err != nil {
			log.Printf("⚠️  Migration file not found: %s", filePath)
			continue
		}

		if _, err := DB.Exec(string(content)); err != nil {
			log.Printf("⚠️  Error running migration %s: %v", migration, err)
			continue
		}

		fmt.Printf("✅ Migration executed: %s\n", migration)
	}
}
