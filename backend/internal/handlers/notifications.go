package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"studybuddy/internal/db"
)

// GetUserNotifications retrieves notifications for the authenticated user
func GetUserNotifications(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	notifications, err := db.GetUserNotifications(userID, limit)
	if err != nil {
		fmt.Printf("Failed to fetch notifications: %v\n", err)
		http.Error(w, "Failed to fetch notifications", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// MarkNotificationAsRead marks a notification as read
func MarkNotificationAsRead(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		NotificationID int `json:"notification_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Verify notification belongs to user
	var belongsToUser bool
	err = db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM notifications WHERE id=$1 AND user_id=$2)`, req.NotificationID, userID).Scan(&belongsToUser)
	if err != nil || !belongsToUser {
		http.Error(w, "notification not found", http.StatusNotFound)
		return
	}

	err = db.MarkNotificationAsRead(req.NotificationID)
	if err != nil {
		http.Error(w, "Failed to mark notification as read", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "success", "message": "Notification marked as read"})
}

// GetUnreadNotificationCount returns unread notification count for user
func GetUnreadNotificationCount(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	count, err := db.GetUnreadNotificationCount(userID)
	if err != nil {
		http.Error(w, "Failed to fetch notification count", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"unread_count": count})
}

// Helper function to create a notification (can be called from other handlers)
func CreateNotification(userID int, notificationType string, title string, message string, relatedGroupID *int, relatedSessionID *int, expiresAt *time.Time) error {
	return db.CreateNotification(userID, notificationType, title, message, relatedGroupID, relatedSessionID, expiresAt)
}
