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
	// Use DATABASE_URL if available (Render/production), otherwise fall back to individual env vars (development)
	var connStr string
	
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		// Production: Use DATABASE_URL directly
		connStr = databaseURL
		// Add sslmode=require for Render if not already present
		if !contains(connStr, "sslmode") {
			connStr += "?sslmode=require"
		}
		fmt.Println("📡 Using DATABASE_URL (Production mode)")
	} else {
		// Development: Use individual environment variables
		user := os.Getenv("DB_USER")
		if user == "" {
			user = "postgres"
		}
		password := os.Getenv("DB_PASSWORD")
		if password == "" {
			password = "postgres"
		}
		host := os.Getenv("DB_HOST")
		if host == "" {
			host = "localhost"
		}
		port := os.Getenv("DB_PORT")
		if port == "" {
			port = "5432"
		}
		name := os.Getenv("DB_NAME")
		if name == "" {
			name = "studybuddy"
		}
		sslmode := os.Getenv("DB_SSLMODE")
		if sslmode == "" {
			sslmode = "disable"
		}
		connStr = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
			user, password, host, port, name, sslmode)
		fmt.Printf("📡 Using individual env vars (Development mode) - connecting to %s\n", host)
	}
	
	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("Database not reachable:", err)
	}
	fmt.Println("✅ Connected to DB")

	// Run migrations
	runMigrations()
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func runMigrations() {
	// List of migration files in order
	migrations := []string{
		"migrates.sql",
		"migrations_groups_create.sql",
		"migrate_messages.sql",
		"migrate_messages_fix_sender_id.sql",
		"migrate_messages_fix_columns.sql",
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
		"migrate_payments.sql",
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
