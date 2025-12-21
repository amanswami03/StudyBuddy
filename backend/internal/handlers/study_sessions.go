package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"studybuddy/internal/db"
)

// StartStudySession starts a new study session
func StartStudySession(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		GroupID *int    `json:"group_id,omitempty"`
		Notes   *string `json:"notes,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	sessionID, err := db.StartStudySession(userID, req.GroupID, req.Notes)
	if err != nil {
		http.Error(w, "Failed to start session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"session_id": sessionID,
		"status":     "started",
		"timestamp":  "now",
	})
}

// EndStudySession ends an active study session
func EndStudySession(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	sessionIDStr := r.URL.Query().Get("session_id")
	if sessionIDStr == "" {
		http.Error(w, "Missing session_id", http.StatusBadRequest)
		return
	}

	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		http.Error(w, "Invalid session_id", http.StatusBadRequest)
		return
	}

	// Verify session belongs to this user
	var ownedByUser int
	errCheck := db.DB.QueryRow(`
		SELECT user_id FROM study_sessions WHERE id = $1 AND is_active = true
	`, sessionID).Scan(&ownedByUser)

	if errCheck != nil || ownedByUser != userID {
		http.Error(w, "Session not found or unauthorized", http.StatusNotFound)
		return
	}

	durationMinutes, err := db.EndStudySession(sessionID)
	if err != nil {
		http.Error(w, "Failed to end session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"session_id":       sessionID,
		"status":           "ended",
		"duration_minutes": durationMinutes,
		"duration_hours":   float64(durationMinutes) / 60,
	})
}

// GetUserStudySessions returns all study sessions for a user
func GetUserStudySessions(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get active sessions
	activeSessions, err := db.GetActiveSessions(userID)
	if err != nil {
		http.Error(w, "Failed to get sessions", http.StatusInternalServerError)
		return
	}

	// Get study stats
	stats, err := db.GetUserStudyStats(userID)
	if err != nil {
		http.Error(w, "Failed to get stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"active_sessions": activeSessions,
		"stats":           stats,
	})
}

// GetStudyStats returns study statistics for the user
func GetStudyStats(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	stats, err := db.GetUserStudyStats(userID)
	if err != nil {
		http.Error(w, "Failed to get study stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
