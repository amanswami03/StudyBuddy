package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"studybuddy/internal/db"
	"studybuddy/internal/models"
	"time"

	"github.com/gorilla/mux"
)

// Request/response DTOs
type CreateGroupRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type JoinGroupRequest struct {
	// nothing required; we use token's user_id
}

// Create a new public group
func CreateGroup(w http.ResponseWriter, r *http.Request) {
	var req CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}

	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var newID int
	err = db.DB.QueryRow(
		`INSERT INTO groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING id`,
		req.Name, req.Description, userID,
	).Scan(&newID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// add creator as member
	_, err = db.DB.Exec(
		`INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING`,
		newID, userID,
	)
	if err != nil {
		// not fatal: continue
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": newID, "message": "group created",
	})
}

// List public groups (simple)
func ListGroups(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`SELECT id, name, description, created_by, created_at FROM groups ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	groups := []models.Group{}
	for rows.Next() {
		var g models.Group
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.CreatedBy, &g.CreatedAt); err != nil {
			continue
		}
		groups = append(groups, g)
	}
	json.NewEncoder(w).Encode(groups)
}

// Join a group
func JoinGroup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	gidStr := vars["id"]
	gid, err := strconv.Atoi(gidStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// insert membership if not exists
	_, err = db.DB.Exec(
		`INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT (group_id, user_id) DO NOTHING`,
		gid, userID,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "joined"})
}

// Leave a group
func LeaveGroup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	gidStr := vars["id"]
	gid, err := strconv.Atoi(gidStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	res, err := db.DB.Exec(`DELETE FROM group_members WHERE group_id=$1 AND user_id=$2`, gid, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		http.Error(w, "not a member", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "left"})
}

// Get group details (optionally include member count)
func GetGroup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	gidStr := vars["id"]
	gid, err := strconv.Atoi(gidStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	var g models.Group
	err = db.DB.QueryRow(`SELECT id, name, description, created_by, created_at FROM groups WHERE id=$1`, gid).
		Scan(&g.ID, &g.Name, &g.Description, &g.CreatedBy, &g.CreatedAt)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// member count
	var cnt int
	_ = db.DB.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id=$1`, gid).Scan(&cnt)

	resp := map[string]interface{}{
		"group":         g,
		"members_count": cnt,
	}
	json.NewEncoder(w).Encode(resp)
}

// GET /api/user/groups - return groups the authenticated user has joined
func GetMyGroups(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := db.DB.Query(`
		SELECT g.id, g.name, g.description, g.created_by, g.created_at,
		  (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS members_count
		FROM groups g
		JOIN group_members gm ON gm.group_id = g.id
		WHERE gm.user_id = $1
		ORDER BY g.created_at DESC
	`, userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type outGroup struct {
		ID           int    `json:"id"`
		Name         string `json:"name"`
		Description  string `json:"description"`
		CreatedBy    int    `json:"created_by"`
		CreatedAt    string `json:"created_at"`
		MembersCount int    `json:"members_count"`
	}

	var res []outGroup
	for rows.Next() {
		var g outGroup
		var createdAt time.Time
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.CreatedBy, &createdAt, &g.MembersCount); err != nil {
			continue
		}
		g.CreatedAt = createdAt.Format(time.RFC3339)
		res = append(res, g)
	}

	json.NewEncoder(w).Encode(res)
}

// GET /api/groups/{id}/messages
func GetGroupMessages(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	gidStr := vars["id"]
	gid, err := strconv.Atoi(gidStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	rows, err := db.DB.Query(`SELECT id, group_id, sender_id, sender_name, content, created_at
		FROM messages WHERE group_id=$1 ORDER BY created_at DESC LIMIT 100`, gid)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// build a stable response shape matching DB columns
	type respMsg struct {
		ID         int64  `json:"id"`
		GroupID    int    `json:"group_id"`
		SenderID   int    `json:"sender_id"`
		SenderName string `json:"sender_name"`
		Content    string `json:"content"`
		CreatedAt  string `json:"created_at"`
	}

	var msgs []respMsg
	for rows.Next() {
		var id int64
		var groupID int
		var senderID int
		var senderName sql.NullString
		var content sql.NullString
		var createdAt time.Time

		if err := rows.Scan(&id, &groupID, &senderID, &senderName, &content, &createdAt); err != nil {
			continue
		}

		m := respMsg{
			ID:         id,
			GroupID:    groupID,
			SenderID:   senderID,
			SenderName: senderName.String,
			Content:    content.String,
			CreatedAt:  createdAt.Format(time.RFC3339),
		}
		msgs = append(msgs, m)
	}

	// reverse to ascending order (oldest first)
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}

	json.NewEncoder(w).Encode(msgs)
}

// PostGroupMessage - HTTP endpoint to post a message (fallback to WebSocket)
func PostGroupMessage(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	var req struct {
		Content      string `json:"content"`
		ClientTempID string `json:"clientTempId,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, "content required", http.StatusBadRequest)
		return
	}

	// Get sender name
	var senderName string
	err = db.DB.QueryRow(`SELECT username FROM users WHERE id=$1`, userID).Scan(&senderName)
	if err != nil {
		senderName = "Unknown"
	}

	// Save message to database - ALWAYS use UTC
	now := time.Now().UTC()
	var messageID int64
	err = db.DB.QueryRow(
		`INSERT INTO messages (group_id, sender_id, sender_name, content, created_at) 
		VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		groupID, userID, senderName, req.Content, now,
	).Scan(&messageID)

	if err != nil {
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}

	// Return the saved message with real ID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":           messageID,
		"clientTempId": req.ClientTempID,
		"group_id":     groupID,
		"sender_id":    userID,
		"sender_name":  senderName,
		"content":      req.Content,
		"created_at":   now.Format(time.RFC3339),
	})
}
