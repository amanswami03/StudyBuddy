package db

import (
	"time"
)

type Notification struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	Type            string    `json:"type"` // new_message, new_session, session_reminder
	Title           string    `json:"title"`
	Message         string    `json:"message"`
	RelatedGroupID  *int      `json:"related_group_id,omitempty"`
	RelatedSessionID *int     `json:"related_session_id,omitempty"`
	IsRead          bool      `json:"is_read"`
	CreatedAt       time.Time `json:"created_at"`
	ExpiresAt       *time.Time `json:"expires_at,omitempty"`
}

// CreateNotification creates a new notification
func CreateNotification(userID int, notificationType string, title string, message string, relatedGroupID *int, relatedSessionID *int, expiresAt *time.Time) error {
	_, err := DB.Exec(`
		INSERT INTO notifications (user_id, type, title, message, related_group_id, related_session_id, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, userID, notificationType, title, message, relatedGroupID, relatedSessionID, expiresAt)
	return err
}

// GetUserNotifications gets recent unread notifications for a user
func GetUserNotifications(userID int, limit int) ([]Notification, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, type, title, message, related_group_id, related_session_id, is_read, created_at, expires_at
		FROM notifications
		WHERE user_id = $1
		AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var notifications []Notification
	for rows.Next() {
		var n Notification
		err := rows.Scan(
			&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message,
			&n.RelatedGroupID, &n.RelatedSessionID, &n.IsRead, &n.CreatedAt, &n.ExpiresAt,
		)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	
	if notifications == nil {
		notifications = make([]Notification, 0)
	}
	
	return notifications, nil
}

// MarkNotificationAsRead marks a notification as read
func MarkNotificationAsRead(notificationID int) error {
	_, err := DB.Exec(`
		UPDATE notifications
		SET is_read = TRUE
		WHERE id = $1
	`, notificationID)
	return err
}

// GetUnreadNotificationCount gets count of unread notifications for a user
func GetUnreadNotificationCount(userID int) (int, error) {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = $1
		AND is_read = FALSE
		AND (expires_at IS NULL OR expires_at > NOW())
	`, userID).Scan(&count)
	return count, err
}
