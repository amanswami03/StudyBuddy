package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"studybuddy/internal/db"
	"time"

	"github.com/gorilla/mux"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// Request/response DTOs
type CreateGroupRequest struct {
	Name                        string `json:"name"`
	Username                    string `json:"username"`
	Description                 string `json:"description"`
	IsPublic                    bool   `json:"is_public"`
	AllowContentViewWithoutJoin bool   `json:"allow_content_view_without_join"`
	RequireAdminApproval        bool   `json:"require_admin_approval"`
}

type UpdateGroupRequest struct {
	Name                        string `json:"name"`
	Description                 string `json:"description"`
	IsPublic                    bool   `json:"is_public"`
	AllowContentViewWithoutJoin bool   `json:"allow_content_view_without_join"`
	RequireAdminApproval        bool   `json:"require_admin_approval"`
}

type JoinGroupRequest struct {
	// nothing required; we use token's user_id
}

// Create a new group with unique username
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
	if req.Username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var newID int
	err = db.DB.QueryRow(
		`INSERT INTO groups (name, username, description, created_by, is_public, allow_content_view_without_join, require_admin_approval, created_at, updated_at) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
		req.Name, req.Username, req.Description, userID, req.IsPublic, req.AllowContentViewWithoutJoin, req.RequireAdminApproval,
	).Scan(&newID)

	if err != nil {
		// Check for unique constraint violation (duplicate username)
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			http.Error(w, "username already taken", http.StatusConflict) // 409
			return
		}

		// Log the actual error for debugging
		log.Printf("Error creating group: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// add creator as admin member
	_, err = db.DB.Exec(
		`INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING`,
		newID, userID,
	)
	if err != nil {
		log.Printf("Error adding creator as admin: %v", err)
		// not fatal: continue
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id": newID, "message": "group created",
	})
}

// List public groups (simple)
func ListGroups(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`
		SELECT g.id, g.name, g.description, g.created_by, g.created_at, g.username, g.is_public, g.allow_content_view_without_join, g.require_admin_approval,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS members_count
		FROM groups g
		WHERE g.is_public = TRUE
		ORDER BY g.created_at DESC LIMIT 100
	`)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type GroupResponse struct {
		ID                   int    `json:"id"`
		Name                 string `json:"name"`
		Description          string `json:"description"`
		CreatedBy            int    `json:"created_by"`
		CreatedAt            string `json:"created_at"`
		Username             string `json:"username"`
		IsPublic             bool   `json:"is_public"`
		AllowContentViewWithoutJoin bool `json:"allow_content_view_without_join"`
		RequireAdminApproval bool   `json:"require_admin_approval"`
		MembersCount         int    `json:"members_count"`
	}

	var groups []GroupResponse
	for rows.Next() {
		var g GroupResponse
		var createdAt sql.NullTime
		var username sql.NullString
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.CreatedBy, &createdAt, &username, &g.IsPublic, &g.AllowContentViewWithoutJoin, &g.RequireAdminApproval, &g.MembersCount); err != nil {
			continue
		}
		if createdAt.Valid {
			g.CreatedAt = createdAt.Time.Format(time.RFC3339)
		} else {
			g.CreatedAt = ""
		}
		if username.Valid {
			g.Username = username.String
		} else {
			g.Username = ""
		}
		groups = append(groups, g)
	}
	w.Header().Set("Content-Type", "application/json")
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

	// Check if group exists and requires admin approval
	var requireApproval bool
	err = db.DB.QueryRow(`SELECT require_admin_approval FROM groups WHERE id=$1`, gid).Scan(&requireApproval)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	// Check if user is already a member (security check)
	var isMember bool
	err = db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2)`, gid, userID).Scan(&isMember)
	if isMember {
		http.Error(w, "already a member of this group", http.StatusConflict)
		return
	}

	// Check if there's already a pending request
	var hasPendingRequest bool
	err = db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM join_requests WHERE group_id=$1 AND user_id=$2 AND status='pending')`, gid, userID).Scan(&hasPendingRequest)
	if hasPendingRequest {
		http.Error(w, "you already have a pending join request", http.StatusConflict)
		return
	}

	if requireApproval {
		// Create a join request instead of directly joining
		_, err = db.DB.Exec(
			`INSERT INTO join_requests (group_id, user_id, status) VALUES ($1, $2, 'pending') ON CONFLICT (group_id, user_id) DO UPDATE SET status='pending'`,
			gid, userID,
		)
		if err != nil {
			log.Printf("Error creating join request: %v", err)
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "join request sent", "status": "pending"})
	} else {
		// Direct join - insert membership
		_, err = db.DB.Exec(
			`INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT (group_id, user_id) DO NOTHING`,
			gid, userID,
		)
		if err != nil {
			log.Printf("Error joining group: %v", err)
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "joined"})
	}
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

	type GroupResponse struct {
		ID                   int    `json:"id"`
		Name                 string `json:"name"`
		Description          string `json:"description"`
		CreatedBy            int    `json:"created_by"`
		CreatedAt            string `json:"created_at"`
		Username             string `json:"username"`
		IsPublic             bool   `json:"is_public"`
		AllowContentViewWithoutJoin bool `json:"allow_content_view_without_join"`
		RequireAdminApproval bool   `json:"require_admin_approval"`
	}

	var g GroupResponse
	var createdAt sql.NullTime
	var username sql.NullString
	err = db.DB.QueryRow(`SELECT id, name, description, created_by, created_at, username, is_public, allow_content_view_without_join, require_admin_approval FROM groups WHERE id=$1`, gid).
		Scan(&g.ID, &g.Name, &g.Description, &g.CreatedBy, &createdAt, &username, &g.IsPublic, &g.AllowContentViewWithoutJoin, &g.RequireAdminApproval)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("GetGroup error: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if createdAt.Valid {
		g.CreatedAt = createdAt.Time.Format(time.RFC3339)
	} else {
		g.CreatedAt = ""
	}
	if username.Valid {
		g.Username = username.String
	} else {
		g.Username = ""
	}

	// member count
	var cnt int
	_ = db.DB.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id=$1`, gid).Scan(&cnt)

	resp := map[string]interface{}{
		"id":                              g.ID,
		"name":                            g.Name,
		"description":                     g.Description,
		"created_by":                      g.CreatedBy,
		"created_at":                      g.CreatedAt,
		"username":                        g.Username,
		"is_public":                       g.IsPublic,
		"allow_content_view_without_join": g.AllowContentViewWithoutJoin,
		"require_admin_approval":          g.RequireAdminApproval,
		"members_count":                   cnt,
	}
	w.Header().Set("Content-Type", "application/json")
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
		SELECT g.id, g.name, g.description, g.created_by, g.created_at, gm.role,
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
		Role         string `json:"role"`
		MembersCount int    `json:"members_count"`
	}

	var res []outGroup
	for rows.Next() {
		var g outGroup
		var createdAt sql.NullTime
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.CreatedBy, &createdAt, &g.Role, &g.MembersCount); err != nil {
			continue
		}
		if createdAt.Valid {
			g.CreatedAt = createdAt.Time.Format(time.RFC3339)
		} else {
			g.CreatedAt = ""
		}
		res = append(res, g)
	}

	w.Header().Set("Content-Type", "application/json")
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

	// Get user ID if authenticated
	userID, _ := GetUserIDFromRequest(r)

	// Check if user has access to see messages
	var isMember bool
	var allowWithoutJoin bool
	err = db.DB.QueryRow(`SELECT 
		COALESCE((SELECT true FROM group_members WHERE group_id=$1 AND user_id=$2), false) as is_member,
		COALESCE(allow_content_view_without_join, false) as allow_without_join
		FROM groups WHERE id=$1`, gid, userID).Scan(&isMember, &allowWithoutJoin)
	
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	// Users can view messages if they're members OR if content viewing is allowed without join
	if !isMember && !allowWithoutJoin && userID > 0 {
		// Check if user has pending request
		var hasPending bool
		db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM join_requests WHERE group_id=$1 AND user_id=$2 AND status='pending')`, gid, userID).Scan(&hasPending)
		if hasPending {
			http.Error(w, "your join request is pending admin approval", http.StatusForbidden)
			return
		}
		http.Error(w, "you don't have permission to view messages in this group", http.StatusForbidden)
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

	// Security check: User must be an approved member to post messages
	if !IsGroupMember(groupID, userID) {
		// Check if they have a pending request
		var hasPending bool
		db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM join_requests WHERE group_id=$1 AND user_id=$2 AND status='pending')`, groupID, userID).Scan(&hasPending)
		if hasPending {
			http.Error(w, "you cannot post until your join request is approved", http.StatusForbidden)
			return
		}
		http.Error(w, "you are not a member of this group", http.StatusForbidden)
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

	// Get group name
	var groupName string
	err = db.DB.QueryRow(`SELECT name FROM groups WHERE id=$1`, groupID).Scan(&groupName)
	if err != nil {
		groupName = "Group"
	}

	// Get all group members to notify them (except sender)
	rows, err := db.DB.Query(
		`SELECT user_id FROM group_members WHERE group_id=$1 AND user_id!=$2`,
		groupID, userID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var memberID int
			if err := rows.Scan(&memberID); err == nil {
				// Create notification for this member
				notifyTitle := "New message in " + groupName
				notifyMessage := senderName + ": " + req.Content
				db.CreateNotification(memberID, "new_message", notifyTitle, notifyMessage, &groupID, nil, nil)
			}
		}
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

// Helper: Check if user is admin of group
func IsGroupAdmin(groupID int, userID int) bool {
	var role string
	err := db.DB.QueryRow(
		`SELECT role FROM group_members WHERE group_id=$1 AND user_id=$2`,
		groupID, userID,
	).Scan(&role)
	return err == nil && role == "admin"
}

// Helper: Check if user is member of group
func IsGroupMember(groupID int, userID int) bool {
	var id int
	err := db.DB.QueryRow(
		`SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2`,
		groupID, userID,
	).Scan(&id)
	return err == nil
}

// GET /api/groups/search?q=query - Search groups by name or username
func SearchGroups(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "search query required", http.StatusBadRequest)
		return
	}

	searchPattern := "%" + query + "%"
	rows, err := db.DB.Query(`
		SELECT g.id, g.name, g.username, g.description, g.created_by, g.is_public, g.created_at,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS members_count
		FROM groups g
		WHERE (g.name ILIKE $1 OR g.username ILIKE $1) AND g.is_public = TRUE
		ORDER BY g.created_at DESC
		LIMIT 50
	`, searchPattern)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type SearchResult struct {
		ID           int    `json:"id"`
		Name         string `json:"name"`
		Username     string `json:"username"`
		Description  string `json:"description"`
		CreatedBy    int    `json:"created_by"`
		IsPublic     bool   `json:"is_public"`
		CreatedAt    string `json:"created_at"`
		MembersCount int    `json:"members_count"`
	}

	var results []SearchResult
	for rows.Next() {
		var r SearchResult
		var createdAt sql.NullTime
		var username sql.NullString
		if err := rows.Scan(&r.ID, &r.Name, &username, &r.Description, &r.CreatedBy, &r.IsPublic, &createdAt, &r.MembersCount); err != nil {
			continue
		}
		if createdAt.Valid {
			r.CreatedAt = createdAt.Time.Format(time.RFC3339)
		} else {
			r.CreatedAt = ""
		}
		if username.Valid {
			r.Username = username.String
		} else {
			r.Username = ""
		}
		results = append(results, r)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// GET /api/groups/{id}/members - Get members of a group
func GetGroupMembers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	rows, err := db.DB.Query(`
		SELECT gm.id, gm.group_id, gm.user_id, u.username, gm.role, gm.joined_at
		FROM group_members gm
		JOIN users u ON u.id = gm.user_id
		WHERE gm.group_id = $1
		ORDER BY gm.role DESC, gm.joined_at ASC
	`, groupID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type MemberInfo struct {
		ID       int    `json:"id"`
		GroupID  int    `json:"group_id"`
		UserID   int    `json:"user_id"`
		Username string `json:"username"`
		Role     string `json:"role"`
		JoinedAt string `json:"joined_at"`
	}

	var members []MemberInfo
	for rows.Next() {
		var m MemberInfo
		var joinedAt time.Time
		if err := rows.Scan(&m.ID, &m.GroupID, &m.UserID, &m.Username, &m.Role, &joinedAt); err != nil {
			continue
		}
		m.JoinedAt = joinedAt.Format(time.RFC3339)
		members = append(members, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

// POST /api/groups/{id}/members/{userId}/remove - Remove member from group (admin only)
func RemoveGroupMember(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	userIDToRemoveStr := vars["userId"]

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	userIDToRemove, err := strconv.Atoi(userIDToRemoveStr)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	adminID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if requester is admin
	if !IsGroupAdmin(groupID, adminID) {
		http.Error(w, "only admins can remove members", http.StatusForbidden)
		return
	}

	// Can't remove self
	if adminID == userIDToRemove {
		http.Error(w, "cannot remove yourself", http.StatusBadRequest)
		return
	}

	_, err = db.DB.Exec(
		`DELETE FROM group_members WHERE group_id=$1 AND user_id=$2`,
		groupID, userIDToRemove,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// Log the action
	db.DB.Exec(
		`INSERT INTO group_member_history (group_id, user_id, action, performed_by) VALUES ($1, $2, 'removed', $3)`,
		groupID, userIDToRemove, adminID,
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "member removed"})
}

// POST /api/groups/{id}/members/{userId}/make-admin - Make user admin (admin only)
func MakeGroupAdmin(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	userIDToMakeAdminStr := vars["userId"]

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	userIDToMakeAdmin, err := strconv.Atoi(userIDToMakeAdminStr)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	adminID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if requester is admin
	if !IsGroupAdmin(groupID, adminID) {
		http.Error(w, "only admins can make admins", http.StatusForbidden)
		return
	}

	// Check if user is member
	if !IsGroupMember(groupID, userIDToMakeAdmin) {
		http.Error(w, "user is not a member", http.StatusBadRequest)
		return
	}

	_, err = db.DB.Exec(
		`UPDATE group_members SET role='admin' WHERE group_id=$1 AND user_id=$2`,
		groupID, userIDToMakeAdmin,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// Log the action
	db.DB.Exec(
		`INSERT INTO group_member_history (group_id, user_id, action, performed_by) VALUES ($1, $2, 'admin_granted', $3)`,
		groupID, userIDToMakeAdmin, adminID,
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "user is now admin"})
}

// POST /api/groups/{id}/members/{userId}/remove-admin - Remove admin status (admin only)
func RemoveGroupAdmin(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	userIDToRemoveAdminStr := vars["userId"]

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	userIDToRemoveAdmin, err := strconv.Atoi(userIDToRemoveAdminStr)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	adminID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if requester is admin
	if !IsGroupAdmin(groupID, adminID) {
		http.Error(w, "only admins can change roles", http.StatusForbidden)
		return
	}

	// Check if user is member
	if !IsGroupMember(groupID, userIDToRemoveAdmin) {
		http.Error(w, "user is not a member", http.StatusBadRequest)
		return
	}

	_, err = db.DB.Exec(
		`UPDATE group_members SET role='member' WHERE group_id=$1 AND user_id=$2`,
		groupID, userIDToRemoveAdmin,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// Log the action
	db.DB.Exec(
		`INSERT INTO group_member_history (group_id, user_id, action, performed_by) VALUES ($1, $2, 'admin_revoked', $3)`,
		groupID, userIDToRemoveAdmin, adminID,
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "admin status removed"})
}

// PUT /api/groups/{id} - Update group settings (admin only)
func UpdateGroup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if requester is admin
	if !IsGroupAdmin(groupID, userID) {
		http.Error(w, "only admins can update group settings", http.StatusForbidden)
		return
	}

	var req UpdateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	_, err = db.DB.Exec(`
		UPDATE groups 
		SET name=$1, description=$2, is_public=$3, allow_content_view_without_join=$4, require_admin_approval=$5, updated_at=NOW()
		WHERE id=$6
	`, req.Name, req.Description, req.IsPublic, req.AllowContentViewWithoutJoin, req.RequireAdminApproval, groupID)

	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "group updated"})
}

// GET /api/groups/{id}/can-view-content - Check if user can view content
func CanViewContent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var allowWithoutJoin bool
	err = db.DB.QueryRow(
		`SELECT allow_content_view_without_join FROM groups WHERE id=$1`,
		groupID,
	).Scan(&allowWithoutJoin)

	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	// If it's allowed without joining, anyone can view
	if allowWithoutJoin {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"can_view": true})
		return
	}

	// Otherwise, user must be a member
	isMember := IsGroupMember(groupID, userID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"can_view": isMember})
}
// GET /api/groups/{id}/join-requests - Get pending join requests for a group (admin only)
func GetJoinRequests(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if requester is admin
	if !IsGroupAdmin(groupID, userID) {
		http.Error(w, "only admins can view join requests", http.StatusForbidden)
		return
	}

	rows, err := db.DB.Query(`
		SELECT jr.id, jr.group_id, jr.user_id, jr.status, jr.requested_at, u.username, u.profile_pic
		FROM join_requests jr
		JOIN users u ON jr.user_id = u.id
		WHERE jr.group_id = $1 AND jr.status = 'pending'
		ORDER BY jr.requested_at DESC
	`, groupID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type JoinRequest struct {
		ID          int       `json:"id"`
		GroupID     int       `json:"group_id"`
		UserID      int       `json:"user_id"`
		Username    string    `json:"username"`
		ProfilePic  *string   `json:"profile_pic"`
		Status      string    `json:"status"`
		RequestedAt time.Time `json:"requested_at"`
	}

	var requests []JoinRequest
	for rows.Next() {
		var req JoinRequest
		err := rows.Scan(&req.ID, &req.GroupID, &req.UserID, &req.Username, &req.ProfilePic, &req.Status, &req.RequestedAt)
		if err != nil {
			continue
		}
		requests = append(requests, req)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// POST /api/groups/{id}/join-requests/{requestId}/approve - Approve a join request
func ApproveJoinRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	requestIDStr := vars["requestId"]

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	requestID, err := strconv.Atoi(requestIDStr)
	if err != nil {
		http.Error(w, "invalid request id", http.StatusBadRequest)
		return
	}

	adminID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if requester is admin
	if !IsGroupAdmin(groupID, adminID) {
		http.Error(w, "only admins can approve join requests", http.StatusForbidden)
		return
	}

	// Get the user_id and status from the join request with security check
	var userID int
	var status string
	err = db.DB.QueryRow(`SELECT user_id, status FROM join_requests WHERE id = $1 AND group_id = $2`, requestID, groupID).Scan(&userID, &status)
	if err != nil {
		http.Error(w, "join request not found", http.StatusNotFound)
		return
	}

	// Only approve pending requests
	if status != "pending" {
		http.Error(w, "can only approve pending requests", http.StatusConflict)
		return
	}

	// Add user as member
	_, err = db.DB.Exec(
		`INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT (group_id, user_id) DO NOTHING`,
		groupID, userID,
	)
	if err != nil {
		log.Printf("Error adding member: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// Update join request status in transaction
	_, err = db.DB.Exec(
		`UPDATE join_requests SET status='approved', reviewed_at=NOW(), reviewed_by=$1 WHERE id=$2 AND status='pending'`,
		adminID, requestID,
	)
	if err != nil {
		log.Printf("Error updating join request: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "join request approved"})
}

// POST /api/groups/{id}/join-requests/{requestId}/reject - Reject a join request
func RejectJoinRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupIDStr := vars["id"]
	requestIDStr := vars["requestId"]

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	requestID, err := strconv.Atoi(requestIDStr)
	if err != nil {
		http.Error(w, "invalid request id", http.StatusBadRequest)
		return
	}

	adminID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if requester is admin
	if !IsGroupAdmin(groupID, adminID) {
		http.Error(w, "only admins can reject join requests", http.StatusForbidden)
		return
	}

	// Verify the request exists and is pending
	var status string
	err = db.DB.QueryRow(`SELECT status FROM join_requests WHERE id = $1 AND group_id = $2`, requestID, groupID).Scan(&status)
	if err != nil {
		http.Error(w, "join request not found", http.StatusNotFound)
		return
	}

	if status != "pending" {
		http.Error(w, "can only reject pending requests", http.StatusConflict)
		return
	}

	type RejectRequest struct {
		Reason string `json:"reason"`
	}

	var req RejectRequest
	json.NewDecoder(r.Body).Decode(&req)

	// Update join request status only if it's still pending
	result, err := db.DB.Exec(
		`UPDATE join_requests SET status='rejected', reviewed_at=NOW(), reviewed_by=$1, rejection_reason=$2 WHERE id=$3 AND group_id=$4 AND status='pending'`,
		adminID, req.Reason, requestID, groupID,
	)
	if err != nil {
		log.Printf("Error rejecting join request: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "failed to reject request", http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "join request rejected"})
}

// DeleteGroup deletes a group (admin only) - requires password verification
func DeleteGroup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	groupID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	// Get user ID from token
	userID := r.Context().Value("userID").(int)

	// Check if user is admin of this group
	var isAdmin bool
	err = db.DB.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND role='admin')`,
		groupID, userID,
	).Scan(&isAdmin)
	if err != nil || !isAdmin {
		http.Error(w, "you are not an admin of this group", http.StatusForbidden)
		return
	}

	// Parse request body for password
	type DeleteGroupRequest struct {
		Password string `json:"password"`
	}
	var req DeleteGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Password == "" {
		http.Error(w, "password required", http.StatusBadRequest)
		return
	}

	// Verify user's password
	var hashedPassword string
	err = db.DB.QueryRow(`SELECT password FROM users WHERE id=$1`, userID).Scan(&hashedPassword)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// Compare password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		http.Error(w, "invalid password", http.StatusUnauthorized)
		return
	}

	// Delete the group (cascade will handle related records)
	result, err := db.DB.Exec(`DELETE FROM groups WHERE id=$1`, groupID)
	if err != nil {
		http.Error(w, "failed to delete group", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "group deleted successfully"})
}