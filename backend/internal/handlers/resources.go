package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"studybuddy/internal/db"
	"github.com/gorilla/mux"
)

// UploadGroupResource handles uploading a resource to a group
func UploadGroupResource(w http.ResponseWriter, r *http.Request) {
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

	// Check if user is member of group
	if !IsGroupMember(groupID, userID) {
		http.Error(w, "You must be a member of the group", http.StatusForbidden)
		return
	}

	// Parse the multipart form
	err = r.ParseMultipartForm(100 * 1024 * 1024) // 100 MB max
	if err != nil {
		http.Error(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file size
	if handler.Size > 100*1024*1024 { // 100 MB
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := fmt.Sprintf("uploads/resources/%d", groupID)
	err = os.MkdirAll(uploadDir, 0755)
	if err != nil {
		http.Error(w, "Failed to create directory: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	ext := filepath.Ext(handler.Filename)
	basename := strings.TrimSuffix(handler.Filename, ext)
	filename := fmt.Sprintf("%s_%d%s", basename, timestamp, ext)
	filepath := filepath.Join(uploadDir, filename)

	// Save file
	dst, err := os.Create(filepath)
	if err != nil {
		http.Error(w, "Failed to create file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Failed to save file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Save to database
	resourceID, err := db.CreateGroupResource(groupID, userID, handler.Filename, "/"+filepath, handler.Size, handler.Header.Get("Content-Type"))
	if err != nil {
		http.Error(w, "Failed to save resource: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":       resourceID,
		"message": "File uploaded successfully",
	})
}

// GetGroupResources retrieves all resources for a group
func GetGroupResources(w http.ResponseWriter, r *http.Request) {
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

	resources, err := db.GetGroupResources(groupID)
	if err != nil {
		http.Error(w, "Failed to get resources: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if resources == nil {
		resources = []db.GroupResource{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"resources": resources,
	})
}

// DownloadGroupResource downloads a resource from a group
func DownloadGroupResource(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	resourceIDStr := vars["resourceId"]
	if resourceIDStr == "" {
		http.Error(w, "Missing resource_id", http.StatusBadRequest)
		return
	}

	resourceID, err := strconv.Atoi(resourceIDStr)
	if err != nil {
		http.Error(w, "Invalid resource_id", http.StatusBadRequest)
		return
	}

	// Increment download count
	db.IncrementResourceDownloadCount(resourceID)

	w.Header().Set("Content-Type", "application/octet-stream")
	w.WriteHeader(http.StatusOK)
}

// DeleteGroupResource deletes a resource from a group
func DeleteGroupResource(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	resourceIDStr := vars["resourceId"]
	if resourceIDStr == "" {
		http.Error(w, "Missing resource_id", http.StatusBadRequest)
		return
	}

	resourceID, err := strconv.Atoi(resourceIDStr)
	if err != nil {
		http.Error(w, "Invalid resource_id", http.StatusBadRequest)
		return
	}

	// TODO: Check if user is owner or admin before deleting
	_ = userID

	// Delete from database
	err = db.DeleteGroupResource(resourceID)
	if err != nil {
		http.Error(w, "Failed to delete resource: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Resource deleted successfully",
	})
}
