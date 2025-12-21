package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"studybuddy/internal/db"
)

// GetUserStats returns user's points, rank, and leaderboard position
func GetUserStats(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get user rank info
	rank, err := db.GetUserRank(userID)
	if err != nil {
		http.Error(w, "Failed to get rank", http.StatusInternalServerError)
		return
	}

	// Get rank thresholds
	thresholds, err := db.GetRankThresholds()
	if err != nil {
		http.Error(w, "Failed to get rank thresholds", http.StatusInternalServerError)
		return
	}

	// Calculate progress to next rank
	var currentRankPoints, nextRankPoints int
	for _, t := range thresholds {
		if t.RankName == rank.CurrentRank {
			currentRankPoints = t.PointsNeeded
		}
		if t.PointsNeeded > rank.TotalPoints {
			nextRankPoints = t.PointsNeeded
			break
		}
	}

	progressToNext := 0
	pointsForNext := nextRankPoints - rank.TotalPoints
	if pointsForNext > 0 {
		progressToNext = int(float64(rank.TotalPoints-currentRankPoints) / float64(nextRankPoints-currentRankPoints) * 100)
		if progressToNext > 100 {
			progressToNext = 100
		}
	}

	response := map[string]interface{}{
		"user_id":          rank.UserID,
		"total_points":     rank.TotalPoints,
		"current_rank":     rank.CurrentRank,
		"login_streak":     rank.LoginStreak,
		"progress_to_next": progressToNext,
		"points_to_next":   pointsForNext,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetLeaderboard returns top users by points
func GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	leaderboard, err := db.GetLeaderboard(limit)
	if err != nil {
		http.Error(w, "Failed to get leaderboard", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leaderboard)
}

// GetRankThresholds returns all rank tiers
func GetRankThresholds(w http.ResponseWriter, r *http.Request) {
	thresholds, err := db.GetRankThresholds()
	if err != nil {
		http.Error(w, "Failed to get rank thresholds", http.StatusInternalServerError)
		return
	}

	response := make([]map[string]interface{}, len(thresholds))
	for i, t := range thresholds {
		response[i] = map[string]interface{}{
			"rank_name":       t.RankName,
			"points_required": t.PointsNeeded,
			"display_order":   t.DisplayOrder,
			"badge_emoji":     t.BadgeEmoji,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// AddMessageReaction marks a message as helpful and awards points to original sender
func AddMessageReaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		MessageID    int    `json:"message_id"`
		ReactionType string `json:"reaction_type"` // "like", "helpful", "emoji", etc.
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// If reaction is "helpful", award points to message sender
	if req.ReactionType == "helpful" {
		// Get message sender
		var senderID int
		query := `SELECT sender_id FROM messages WHERE id = $1`
		err := db.DB.QueryRow(query, req.MessageID).Scan(&senderID)
		if err != nil {
			http.Error(w, "Message not found", http.StatusNotFound)
			return
		}

		// Award points to message sender
		err = db.AddPoints(senderID, db.HelpfulMark, map[string]interface{}{
			"message_id":    req.MessageID,
			"reacted_by":    userID,
			"reaction_type": req.ReactionType,
		})
		if err != nil {
			http.Error(w, "Failed to award points", http.StatusInternalServerError)
			return
		}
	}

	// Insert reaction record
	query := `
		INSERT INTO message_reactions (message_id, reactor_user_id, reaction_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (message_id, reactor_user_id, reaction_type) DO NOTHING
	`
	_, execErr := db.DB.Exec(query, req.MessageID, userID, req.ReactionType)
	if execErr != nil {
		http.Error(w, "Failed to add reaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Reaction added",
	})
}

// GetUserPointsHistory returns point transaction history
func GetUserPointsHistory(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	query := `
		SELECT id, points_change, action_type, action_details, created_at
		FROM user_points_ledger
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := db.DB.Query(query, userID, limit)
	if err != nil {
		http.Error(w, "Failed to get history", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type PointTransaction struct {
		ID            int                    `json:"id"`
		PointsChange  int                    `json:"points_change"`
		ActionType    string                 `json:"action_type"`
		ActionDetails map[string]interface{} `json:"action_details"`
		CreatedAt     string                 `json:"created_at"`
	}

	var history []PointTransaction
	for rows.Next() {
		var tx PointTransaction
		var actionDetailsJSON []byte

		if err := rows.Scan(&tx.ID, &tx.PointsChange, &tx.ActionType, &actionDetailsJSON, &tx.CreatedAt); err != nil {
			http.Error(w, "Failed to parse transaction", http.StatusInternalServerError)
			return
		}

		if actionDetailsJSON != nil {
			json.Unmarshal(actionDetailsJSON, &tx.ActionDetails)
		}

		history = append(history, tx)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// GetUserActivityStats returns study hours, sessions attended, and resources shared
func GetUserActivityStats(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Count messages sent by user (sessions attended proxy)
	var sessionsAttended int
	err = db.DB.QueryRow(`
		SELECT COUNT(*) FROM messages WHERE sender_id = $1
	`, userID).Scan(&sessionsAttended)
	if err != nil {
		sessionsAttended = 0
	}

	// Count groups user is member of
	var groupsJoined int
	err = db.DB.QueryRow(`
		SELECT COUNT(*) FROM group_members WHERE user_id = $1
	`, userID).Scan(&groupsJoined)
	if err != nil {
		groupsJoined = 0
	}

	// Calculate study hours from actual study sessions (real time spent)
	var studyHours int
	err = db.DB.QueryRow(`
		SELECT COALESCE(SUM(duration_minutes) / 60, 0) FROM study_sessions 
		WHERE user_id = $1 AND is_active = false AND end_time IS NOT NULL
	`, userID).Scan(&studyHours)
	if err != nil {
		studyHours = 0
	}

	// Count actual files shared by user (message_type = 'file')
	var resourcesShared int
	err = db.DB.QueryRow(`
		SELECT COUNT(*) FROM messages WHERE sender_id = $1 AND message_type = 'file'
	`, userID).Scan(&resourcesShared)
	if err != nil {
		resourcesShared = 0
	}

	response := map[string]interface{}{
		"user_id":           userID,
		"study_hours":       studyHours,
		"sessions_attended": sessionsAttended,
		"groups_joined":     groupsJoined,
		"resources_shared":  resourcesShared,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
