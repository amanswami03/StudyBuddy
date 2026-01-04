package models

import (
	"time"
)

type Message struct {
	ID        int64     `json:"id" db:"id"`
	GroupID   string    `json:"group_id" db:"group_id"`
	SenderID  int       `json:"sender_id" db:"sender_id"`
	SenderName string   `json:"sender_name" db:"sender_name"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
