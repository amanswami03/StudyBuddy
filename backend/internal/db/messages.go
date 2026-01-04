package db

import (
	"database/sql"
	"time"

	"studybuddy/internal/models"
)

func SaveMessage(db *sql.DB, msg models.Message) error {
	_, err := db.Exec(
		"INSERT INTO messages (group_id, sender_id, sender_name, content, created_at, message_type) VALUES ($1, $2, $3, $4, $5, $6)",
		msg.GroupID, msg.SenderID, msg.SenderName, msg.Content, time.Now().UTC(), "text",
	)
	return err
}

func GetMessages(db *sql.DB, groupID string) ([]models.Message, error) {
	rows, err := db.Query(
		"SELECT id, group_id, sender_id, sender_name, content, created_at FROM messages WHERE group_id = $1 ORDER BY created_at ASC",
		groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.Message
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.ID, &m.GroupID, &m.SenderID, &m.SenderName, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}
