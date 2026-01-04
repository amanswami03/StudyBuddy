package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"studybuddy/internal/db"
	"github.com/gorilla/mux"
)

// CreateGroupSession handles creating a new scheduled session for a group
func CreateGroupSession(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	if groupIDStr == "" {
		http.Error(w, "Missing group_id", http.StatusBadRequest)
		return
	}

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group_id", http.StatusBadRequest)
		return
	}

	// Check if user is a member of the group
	if !IsGroupMember(groupID, userID) {
		http.Error(w, "You must be a member of the group to create sessions", http.StatusForbidden)
		return
	}

	var req struct {
		Title           string        `json:"title"`
		Description     string        `json:"description"`
		ScheduledTime   time.Time     `json:"scheduled_time"`
		DurationMinutes int           `json:"duration_minutes"`
		VotingEnabled   bool          `json:"voting_enabled"`
		VotingOptions   []time.Time   `json:"voting_options,omitempty"`
		MaxAttendees    *int          `json:"max_attendees,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Log the received data
	fmt.Printf("CreateGroupSession - Title: %s, ScheduledTime: %v, Duration: %d\n", req.Title, req.ScheduledTime, req.DurationMinutes)

	if req.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	
	// Check if title is unique within the group
	var existingID int
	err = db.DB.QueryRow(
		`SELECT id FROM scheduled_group_sessions WHERE group_id=$1 AND title=$2`,
		groupID, req.Title,
	).Scan(&existingID)
	if err == nil {
		http.Error(w, "A session with this title already exists in the group", http.StatusConflict)
		return
	}
	if err != sql.ErrNoRows {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	
	if req.DurationMinutes <= 0 {
		http.Error(w, "Duration must be greater than 0", http.StatusBadRequest)
		return
	}
	
	if req.ScheduledTime.IsZero() {
		http.Error(w, "Scheduled time is required", http.StatusBadRequest)
		return
	}

	// Create the session
	sessionID, err := db.CreateGroupSession(groupID, userID, req.Title, req.Description, req.ScheduledTime, req.DurationMinutes, req.VotingEnabled)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Add voting options if provided
	if req.VotingEnabled && len(req.VotingOptions) > 0 {
		for _, optionTime := range req.VotingOptions {
			db.AddVotingOption(sessionID, optionTime)
		}
	}

	// Create notifications for all group members
	rows, err := db.DB.Query(`SELECT DISTINCT user_id FROM group_members WHERE group_id=$1`, groupID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var memberID int
			if err := rows.Scan(&memberID); err == nil {
				// Calculate expiration time (1 hour before session starts)
				expiresAt := req.ScheduledTime.Add(-1 * time.Hour)
				CreateNotification(memberID, "new_session", "New Session Scheduled: "+req.Title, 
					"A new study session '"+req.Title+"' has been scheduled for "+req.ScheduledTime.Format("Jan 2, 3:04 PM"), 
					&groupID, &sessionID, &expiresAt)
			}
		}
	}

	// Fetch the created session
	session, err := db.GetGroupSession(sessionID, userID)
	if err != nil {
		http.Error(w, "Failed to fetch session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(session)
}

// GetGroupSessions retrieves all sessions for a group
func GetGroupSessions(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	if groupIDStr == "" {
		http.Error(w, "Missing group_id", http.StatusBadRequest)
		return
	}

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group_id", http.StatusBadRequest)
		return
	}

	sessions, err := db.GetGroupSessions(groupID, userID)
	if err != nil {
		http.Error(w, "Failed to get sessions", http.StatusInternalServerError)
		return
	}

	if sessions == nil {
		sessions = []db.ScheduledGroupSession{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sessions": sessions,
	})
}

// GetGroupSession retrieves a single session by ID
func GetGroupSession(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	sessionIDStr := vars["id"]
	if sessionIDStr == "" {
		http.Error(w, "Missing session_id", http.StatusBadRequest)
		return
	}

	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		http.Error(w, "Invalid session_id", http.StatusBadRequest)
		return
	}

	session, err := db.GetGroupSession(sessionID, userID)
	if err != nil {
		http.Error(w, "Failed to get session", http.StatusInternalServerError)
		return
	}

	if session == nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// JoinSession marks a user as attending a session
func JoinSession(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	sessionIDStr := vars["id"]
	if sessionIDStr == "" {
		http.Error(w, "Missing session_id", http.StatusBadRequest)
		return
	}

	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		http.Error(w, "Invalid session_id", http.StatusBadRequest)
		return
	}

	var req struct {
		Status string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Status == "" {
		req.Status = "attending"
	}

	// Add user as attendee
	err = db.AddSessionAttendee(sessionID, userID, req.Status)
	if err != nil {
		http.Error(w, "Failed to join session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Joined session successfully",
	})
}

// VoteForSessionTime records a user's vote for a session time option
func VoteForSessionTime(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	sessionIDStr := vars["id"]
	optionIDStr := r.URL.Query().Get("option_id")

	if sessionIDStr == "" || optionIDStr == "" {
		http.Error(w, "Missing session_id or option_id", http.StatusBadRequest)
		return
	}

	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		http.Error(w, "Invalid session_id", http.StatusBadRequest)
		return
	}

	optionID, err := strconv.Atoi(optionIDStr)
	if err != nil {
		http.Error(w, "Invalid option_id", http.StatusBadRequest)
		return
	}

	// Record the vote
	err = db.UserVoteForOption(sessionID, userID, optionID)
	if err != nil {
		http.Error(w, "Failed to record vote", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Vote recorded successfully",
	})
}

// GetSessionAttendees retrieves all attendees for a session
func GetSessionAttendees(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionIDStr := vars["id"]
	if sessionIDStr == "" {
		http.Error(w, "Missing session_id", http.StatusBadRequest)
		return
	}

	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		http.Error(w, "Invalid session_id", http.StatusBadRequest)
		return
	}

	attendees, err := db.GetSessionAttendees(sessionID)
	if err != nil {
		http.Error(w, "Failed to get attendees", http.StatusInternalServerError)
		return
	}

	if attendees == nil {
		attendees = []struct {
			UserID   int
			Username string
			Status   string
		}{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"attendees": attendees,
	})
}

// DeleteGroupSession handles deleting a scheduled session
func DeleteGroupSession(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	sessionIDStr := vars["id"]
	if sessionIDStr == "" {
		http.Error(w, "Missing session_id", http.StatusBadRequest)
		return
	}

	sessionID, err := strconv.Atoi(sessionIDStr)
	if err != nil {
		http.Error(w, "Invalid session_id", http.StatusBadRequest)
		return
	}

	// Get session to check permissions
	session, err := db.GetGroupSession(sessionID, userID)
	if err != nil || session == nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	// Check if user is admin of the group
	if !IsGroupAdmin(session.GroupID, userID) {
		http.Error(w, "Only group admins can delete sessions", http.StatusForbidden)
		return
	}

	// Delete the session
	err = db.DeleteGroupSession(sessionID)
	if err != nil {
		http.Error(w, "Failed to delete session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Session deleted successfully",
	})
}
// GetUserUpcomingSessions retrieves all upcoming sessions for the authenticated user across all groups
func GetUserUpcomingSessions(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		fmt.Printf("Unauthorized: %v\n", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fmt.Printf("Fetching upcoming sessions for user %d\n", userID)

	// Get all upcoming sessions for user across all groups they're part of
	sessions, err := db.GetUserUpcomingSessions(userID)
	if err != nil {
		fmt.Printf("Failed to fetch sessions: %v\n", err)
		http.Error(w, "Failed to fetch sessions", http.StatusInternalServerError)
		return
	}

	fmt.Printf("Found %d sessions for user %d\n", len(sessions), userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}