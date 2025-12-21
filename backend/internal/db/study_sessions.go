package db

import (
	"time"
)

type StudySession struct {
	ID              int        `json:"id"`
	UserID          int        `json:"user_id"`
	StartTime       time.Time  `json:"start_time"`
	EndTime         *time.Time `json:"end_time,omitempty"`
	DurationMinutes *int       `json:"duration_minutes,omitempty"`
	GroupID         *int       `json:"group_id,omitempty"`
	Notes           *string    `json:"notes,omitempty"`
	IsActive        bool       `json:"is_active"`
	CreatedAt       time.Time  `json:"created_at"`
}

// StartStudySession creates a new active study session
func StartStudySession(userID int, groupID *int, notes *string) (int, error) {
	var sessionID int
	err := DB.QueryRow(`
		INSERT INTO study_sessions (user_id, group_id, notes, is_active, start_time)
		VALUES ($1, $2, $3, true, NOW())
		RETURNING id
	`, userID, groupID, notes).Scan(&sessionID)

	return sessionID, err
}

// EndStudySession ends an active study session and calculates duration
func EndStudySession(sessionID int) (int, error) {
	var durationMinutes int
	err := DB.QueryRow(`
		UPDATE study_sessions 
		SET end_time = NOW(), 
		    is_active = false,
		    duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))::int / 60,
		    updated_at = NOW()
		WHERE id = $1 AND is_active = true
		RETURNING duration_minutes
	`, sessionID).Scan(&durationMinutes)

	return durationMinutes, err
}

// GetActiveSessions returns all active sessions for a user
func GetActiveSessions(userID int) ([]StudySession, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, start_time, end_time, duration_minutes, group_id, notes, is_active, created_at
		FROM study_sessions
		WHERE user_id = $1 AND is_active = true
		ORDER BY start_time DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []StudySession
	for rows.Next() {
		var session StudySession
		err := rows.Scan(
			&session.ID, &session.UserID, &session.StartTime, &session.EndTime,
			&session.DurationMinutes, &session.GroupID, &session.Notes, &session.IsActive, &session.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}

	return sessions, rows.Err()
}

// GetUserStudyHours calculates total study hours for a user (completed sessions only)
func GetUserStudyHours(userID int) (int, error) {
	var totalMinutes int
	err := DB.QueryRow(`
		SELECT COALESCE(SUM(duration_minutes), 0) FROM study_sessions
		WHERE user_id = $1 AND is_active = false AND end_time IS NOT NULL
	`, userID).Scan(&totalMinutes)

	if err != nil {
		return 0, err
	}

	// Convert minutes to hours
	return totalMinutes / 60, nil
}

// GetUserStudyStats returns detailed study statistics
func GetUserStudyStats(userID int) (map[string]interface{}, error) {
	var totalMinutes int
	var sessionCount int
	var avgMinutes float64

	err := DB.QueryRow(`
		SELECT 
			COALESCE(SUM(duration_minutes), 0) as total_minutes,
			COUNT(*) as session_count,
			COALESCE(AVG(duration_minutes), 0) as avg_minutes
		FROM study_sessions
		WHERE user_id = $1 AND is_active = false AND end_time IS NOT NULL
	`, userID).Scan(&totalMinutes, &sessionCount, &avgMinutes)

	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"total_minutes":    totalMinutes,
		"total_hours":      totalMinutes / 60,
		"session_count":    sessionCount,
		"avg_session_mins": int(avgMinutes),
	}

	return stats, nil
}
