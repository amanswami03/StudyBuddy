package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"studybuddy/internal/db"
	"studybuddy/internal/ws"

	"github.com/gorilla/mux"
)

// Global hub reference (set in main.go)
var GlobalHub *ws.Hub

// UploadMessage handles multipart file uploads for a group and creates a message pointing to the uploaded file.
// Endpoint: POST /api/groups/{id}/messages/upload
func UploadMessage(w http.ResponseWriter, r *http.Request) {
	// get group id from URL
	vars := mux.Vars(r)
	gidStr := vars["id"]
	groupID, err := strconv.Atoi(gidStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	// authenticate user from Authorization header
	uid, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// parse multipart form (limit to 200MB here; adjust as needed)
	if err := r.ParseMultipartForm(200 << 20); err != nil {
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get clientTempId from form if provided (for deduplication)
	clientTempId := r.FormValue("clientTempId")

	// ensure uploads directory exists
	uploadDir := filepath.Join("uploads", gidStr)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "failed to create upload dir", http.StatusInternalServerError)
		return
	}

	// create safe filename
	ts := time.Now().Unix()
	safeName := fmt.Sprintf("%d_%s", ts, filepath.Base(header.Filename))
	dstPath := filepath.Join(uploadDir, safeName)

	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "failed to create file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}

	// build accessible URL path (served at /uploads/...)
	fileURL := fmt.Sprintf("/uploads/%s/%s", gidStr, safeName)

	// get sender name
	var senderName string
	_ = db.DB.QueryRow(`SELECT username FROM users WHERE id=$1`, uid).Scan(&senderName)

	// message content will be a JSON object describing the file
	meta := map[string]interface{}{
		"type":     "file",
		"url":      fileURL,
		"filename": header.Filename,
		"size":     header.Size,
		"mime":     header.Header.Get("Content-Type"),
	}
	metaBytes, _ := json.Marshal(meta)

	// persist message in DB - ALWAYS use UTC
	now := time.Now().UTC()
	var messageID int64
	err = db.DB.QueryRow(
		`INSERT INTO messages (group_id, sender_id, sender_name, content, created_at, message_type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		groupID, uid, senderName, string(metaBytes), now, "file",
	).Scan(&messageID)
	if err != nil {
		// log and continue
		fmt.Println("failed to save uploaded message:", err)
	}

	// Broadcast to group's hub so all connected clients get notified
	payload := map[string]interface{}{
		"id":           messageID,
		"group_id":     groupID,
		"sender_id":    uid,
		"sender_name":  senderName,
		"content":      string(metaBytes),
		"created_at":   now.Format(time.RFC3339),
		"clientTempId": clientTempId, // Echo back for deduplication
	}
	out, _ := json.Marshal(payload)

	// Broadcast via hub if available
	if GlobalHub != nil {
		GlobalHub.Broadcast <- ws.Message{
			GroupID: gidStr,
			Data:    out,
			UserID:  uid,
		}
	}

	// return file meta
	w.Header().Set("Content-Type", "application/json")
	w.Write(out)
}
